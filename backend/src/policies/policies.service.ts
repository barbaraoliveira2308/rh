import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { PolicyStatus } from './entities/policy-status.enum';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
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
}
