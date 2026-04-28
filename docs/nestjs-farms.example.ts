/**
 * Example NestJS pieces for GET/POST /api/farms — align field names with your User entity & auth guard.
 * Register FarmModule in AppModule; prefix is often global 'api' so routes become /api/farms.
 */

// --- farm.entity.ts (TypeORM example) ---
/*
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('farms')
export class Farm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;
}
*/

// --- create-farm.dto.ts ---
/*
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFarmDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
*/

// --- farms.service.ts ---
/*
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Farm } from './farm.entity';
import { CreateFarmDto } from './create-farm.dto';

@Injectable()
export class FarmsService {
  constructor(@InjectRepository(Farm) private repo: Repository<Farm>) {}

  findForUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { name: 'ASC' } });
  }

  async create(dto: CreateFarmDto, authUserId: string) {
    const userId = dto.userId && dto.userId === authUserId ? dto.userId : authUserId;
    const row = this.repo.create({
      userId,
      name: dto.name.trim(),
      address: dto.address?.trim() || null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
    });
    return this.repo.save(row);
  }
}
*/

// --- farms.controller.ts ---
/*
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FarmsService } from './farms.service';
import { CreateFarmDto } from './create-farm.dto';

@Controller('farms')
@UseGuards(JwtAuthGuard)
export class FarmsController {
  constructor(private farms: FarmsService) {}

  @Get()
  list(@Req() req: { user: { sub: string } }) {
    return this.farms.findForUser(req.user.sub);
  }

  @Post()
  create(@Body() dto: CreateFarmDto, @Req() req: { user: { sub: string } }) {
    return this.farms.create(dto, req.user.sub);
  }
}
*/

// Extend Procurement entity/DTO with optional farmId (UUID, FK to Farm) for harvest ↔ farm links.
