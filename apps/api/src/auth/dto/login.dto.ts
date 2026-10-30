import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ type: String, format: 'email', example: 'student@example.com' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, minLength: 1 })
  @IsString()
  @MinLength(1)
  password!: string;
}
