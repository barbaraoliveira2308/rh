import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { PolicyStatus } from './entities/policy-status.enum';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { PolicyAcceptance } from './entities/policy-acceptance.entity';
import { PendingAcceptanceUserDto } from './dto/pending-acceptance-user.dto';
import { User } from '../auth/entities/user.entity';
import { NotificationsService } from '../notifications/services/notifications.service';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    @InjectRepository(PolicyAcceptance)
    private readonly acceptanceRepository: Repository<PolicyAcceptance>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreatePolicyDto, authorId: string): Promise<Policy> {
    const policy = this.policyRepository.create({
      title: dto.title,
      content: dto.content,
      category: dto.category,
      authorId,
      status: PolicyStatus.DRAFT,
      version: 1,
      tags: dto.tags ?? null,
    });
    return this.policyRepository.save(policy);
  }

  async findAll(
    q?: string,
    category?: string,
    status?: PolicyStatus,
    canManage = false,
  ): Promise<Policy[]> {
    const effectiveStatus = canManage && status ? status : PolicyStatus.PUBLISHED;
    const query = this.policyRepository
      .createQueryBuilder('p')
      .where('p.status = :status', { status: effectiveStatus });

    if (q?.trim()) {
      query.andWhere(
        `to_tsvector('portuguese', p.content || ' ' || p.title) @@ plainto_tsquery('portuguese', :q)`,
        { q },
      );
    }

    if (category) {
      query.andWhere('p.category = :category', { category });
    }

    return query.orderBy('p.published_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<Policy> {
    const policy = await this.policyRepository.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException('Política não encontrada');
    }
    return policy;
  }

  async findVersions(id: string): Promise<Policy[]> {
    const policy = await this.findOne(id);
    if (!policy.parentId) {
      return this.policyRepository.find({
        where: [{ id }, { parentId: id }],
        order: { version: 'DESC' },
      });
    }
    return this.policyRepository.find({
      where: [{ id: policy.parentId }, { parentId: policy.parentId }],
      order: { version: 'DESC' },
    });
  }

  async update(id: string, dto: UpdatePolicyDto): Promise<Policy> {
    const current = await this.findOne(id);

    const newVersion = this.policyRepository.create({
      title: dto.title ?? current.title,
      content: dto.content ?? current.content,
      category: dto.category ?? current.category,
      status: PolicyStatus.DRAFT,
      authorId: current.authorId,
      version: current.version + 1,
      parentId: current.parentId ?? current.id,
      tags: dto.tags ?? current.tags,
    });

    return this.policyRepository.save(newVersion);
  }

  async publish(id: string): Promise<Policy> {
    const policy = await this.findOne(id);
    if (policy.status === PolicyStatus.ARCHIVED) {
      throw new BadRequestException('Não é possível publicar uma política arquivada');
    }
    policy.status = PolicyStatus.PUBLISHED;
    policy.publishedAt = new Date();
    return this.policyRepository.save(policy);
  }

  async archive(id: string): Promise<void> {
    const policy = await this.findOne(id);
    policy.status = PolicyStatus.ARCHIVED;
    await this.policyRepository.save(policy);
  }

  async findPendingAcceptances(userId: string): Promise<Policy[]> {
    return this.policyRepository
      .createQueryBuilder('policy')
      .leftJoin(
        PolicyAcceptance,
        'acceptance',
        'acceptance.policy_id = policy.id AND acceptance.user_id = :userId',
        { userId },
      )
      .where('policy.status = :status', { status: PolicyStatus.PUBLISHED })
      .andWhere('acceptance.id IS NULL')
      .orderBy('policy.published_at', 'DESC')
      .getMany();
  }

  async acceptPolicy(policyId: string, userId: string): Promise<PolicyAcceptance> {
    const policy = await this.findOne(policyId);
    if (policy.status !== PolicyStatus.PUBLISHED) {
      throw new BadRequestException('Apenas políticas publicadas podem ser aceites');
    }

    const existing = await this.acceptanceRepository.findOne({ where: { userId, policyId } });
    if (existing) return existing;

    return this.acceptanceRepository.save(
      this.acceptanceRepository.create({
        userId,
        policyId,
        policyVersion: policy.version,
      }),
    );
  }

  async findAcceptanceLogs(): Promise<PolicyAcceptance[]> {
    return this.acceptanceRepository.find({
      relations: { user: true, policy: true },
      order: { acceptedAt: 'DESC' },
    });
  }

  async findPendingAcceptanceUsers(): Promise<PendingAcceptanceUserDto[]> {
    const publishedPolicies = await this.policyRepository.find({
      where: { status: PolicyStatus.PUBLISHED },
    });
    if (publishedPolicies.length === 0) return [];

    const activeUsers = await this.userRepository.find({ where: { isActive: true } });
    if (activeUsers.length === 0) return [];

    const acceptances = await this.acceptanceRepository.find({
      where: { policyId: In(publishedPolicies.map((p) => p.id)) },
    });
    const acceptedKeys = new Set(acceptances.map((a) => `${a.userId}:${a.policyId}`));

    const result: PendingAcceptanceUserDto[] = [];
    for (const user of activeUsers) {
      const pendingPolicies = publishedPolicies.filter(
        (policy) => !acceptedKeys.has(`${user.id}:${policy.id}`),
      );
      if (pendingPolicies.length > 0) {
        result.push({
          userId: user.id,
          email: user.email,
          username: user.username,
          pendingPolicies: pendingPolicies.map((policy) => ({
            id: policy.id,
            title: policy.title,
            version: policy.version,
          })),
        });
      }
    }
    return result;
  }

  async remindUser(userId: string): Promise<{ pendingCount: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }

    const pendingPolicies = await this.findPendingAcceptances(userId);
    if (pendingPolicies.length === 0) {
      throw new BadRequestException('Utilizador não tem políticas pendentes de aceite');
    }

    const titles = pendingPolicies.map((policy) => policy.title).join(', ');
    await this.notificationsService.sendInApp(
      userId,
      'policy.acceptance.reminder',
      'Políticas pendentes de aceite',
      `Tem ${String(pendingPolicies.length)} política(s) por ler e aceitar: ${titles}`,
    );

    return { pendingCount: pendingPolicies.length };
  }
}
