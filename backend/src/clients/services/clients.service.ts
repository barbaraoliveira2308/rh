import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Client, ClientStatus } from '../entities/client.entity';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(dto: CreateClientDto): Promise<Client> {
    if (dto.nif) {
      const existing = await this.clientRepository.findOne({
        where: { nif: dto.nif },
      });
      if (existing) {
        throw new ConflictException('NIF já registado');
      }
    }

    const client = this.clientRepository.create(dto as Partial<Client>);
    return this.clientRepository.save(client);
  }

  async findAll(): Promise<Client[]> {
    return this.clientRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['responsible'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['responsible'],
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    if (dto.nif && dto.nif !== client.nif) {
      const existing = await this.clientRepository.findOne({
        where: { nif: dto.nif },
      });
      if (existing) {
        throw new ConflictException('NIF já registado');
      }
    }

    await this.clientRepository.update(id, dto);
    return this.findOne(id);
  }

  async deactivate(id: string): Promise<Client> {
    const client = await this.findOne(id);
    if (client.status === ClientStatus.INACTIVE) {
      throw new ConflictException('Cliente já está inativo');
    }
    client.status = ClientStatus.INACTIVE;
    return this.clientRepository.save(client);
  }

  async softDelete(id: string): Promise<void> {
    const client = await this.findOne(id);
    client.deletedAt = new Date();
    await this.clientRepository.save(client);
  }

  async getProjects(clientId: string): Promise<{ data: unknown[] }> {
    await this.findOne(clientId);
    return { data: [] };
  }
}
