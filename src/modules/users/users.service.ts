import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto, pageResult } from '../../common/dto/pagination.dto';
import { User } from './entities/user.entity';
import { userResponse } from './dto/user-response.dto';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}
  findForLogin(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }
  async get(id: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return userResponse(user);
  }
  async list(query: PaginationDto) {
    const [items, total] = await this.users.findAndCount({
      order: { createdAt: 'DESC', id: 'ASC' },
      take: query.limit,
      skip: query.skip,
    });
    return pageResult(items.map(userResponse), total, query);
  }
}
