import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role, UserStatus } from '@prisma/client';

export class PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @Type(() => Number) @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;
}

export class PaginationMetaDto {
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) limit!: number;
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) totalPages!: number;
}

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() q?: string;
}

export class AdminUserDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) fullName!: string;
  @ApiProperty({ type: String }) email!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
}

export class AdminUsersResponseDto {
  @ApiProperty({ type: () => [AdminUserDto] }) items!: AdminUserDto[];
  @ApiProperty({ type: () => PaginationMetaDto }) meta!: PaginationMetaDto;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus }) @IsEnum(UserStatus) status!: UserStatus;
}

export class AdminUserStatusResponseDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
}

export class UsersByRoleDto {
  @ApiProperty({ type: Number }) STUDENT!: number;
  @ApiProperty({ type: Number }) TEACHER!: number;
  @ApiProperty({ type: Number }) ADMINISTRATOR!: number;
}

export class AdminDashboardResponseDto {
  @ApiProperty({ type: Number }) totalUsers!: number;
  @ApiProperty({ type: () => UsersByRoleDto }) usersByRole!: UsersByRoleDto;
  @ApiProperty({ type: Number }) totalFeedback!: number;
  @ApiProperty({ type: Number }) totalAIRequests!: number;
  @ApiProperty({ type: Number }) failedAIRequests!: number;
}

export function paginationMeta(query: PaginationQueryDto, total: number): PaginationMetaDto {
  return { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
}
