import { SORT_DIRECTION } from '../../util/pagination/pagination.interface'
import { ApiProperty } from '@nestjs/swagger'
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNotEmpty,
  ValidateIf
} from 'class-validator'
import { IsSortDirection } from '../../util/validators/sort-directions.validator'
import { TAG_TYPES } from '../../tag/models/tag-types.enum'
import { Transform } from 'class-transformer'
import { ApiArrayQuery } from '../../util/decorators/api-array-query.decorator'

/**
 * @description Basing this off of PaginatedSearchAssetDto as boilerplate
 * @date 2023-04-23 01:00
 */
export class PaginatedSearchSpaceDto {
  @IsOptional()
  @IsString()
  @ApiProperty()
  field?: string

  @IsOptional()
  @IsString()
  @ApiProperty()
  search?: string

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: `Default is updatedAt: desc`
  })
  sortKey?: string

  @IsOptional()
  @ApiProperty({
    description: `Default is updatedAt: desc`
  })
  @IsSortDirection()
  sortDirection?: SORT_DIRECTION

  @IsOptional()
  @ApiProperty()
  page?: number

  @IsOptional()
  @ApiProperty()
  perPage?: number

  @IsOptional()
  @ApiArrayQuery([String])
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tag?: string[]

  @ValidateIf((o) => o.tag)
  @IsNotEmpty()
  @IsEnum(TAG_TYPES)
  @ApiProperty({ enum: () => TAG_TYPES })
  tagType?: TAG_TYPES

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false
  })
  startItem: number

  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  numberOfItems: number
}
