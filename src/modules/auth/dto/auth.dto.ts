import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { UserResponseDto } from '../../users/dto/user-response.dto';
export class LoginDto {
  @ApiProperty({ example: 'owner@demo.local' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ format: 'password', minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
export class RefreshTokenDto {
  @ApiProperty({ description: 'Current refresh JWT' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  refreshToken!: string;
}
export class TokenResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ example: 'Bearer' }) tokenType!: string;
  @ApiProperty({ example: 900 }) expiresIn!: number;
  @ApiProperty({ type: UserResponseDto }) user!: UserResponseDto;
}
