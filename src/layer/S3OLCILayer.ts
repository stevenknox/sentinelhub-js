import moment from 'moment';

import { BBox } from 'src/bbox';
import { PaginatedTiles, Link, LinkType } from 'src/layer/const';
import { DATASET_S3OLCI } from 'src/layer/dataset';
import { AbstractSentinelHubV3Layer } from 'src/layer/AbstractSentinelHubV3Layer';
import { RequestConfiguration } from 'src/utils/cancelRequests';
import { ensureTimeout } from 'src/utils/ensureTimeout';

export class S3OLCILayer extends AbstractSentinelHubV3Layer {
  public readonly dataset = DATASET_S3OLCI;

  public async findTiles(
    bbox: BBox,
    fromTime: Date,
    toTime: Date,
    maxCount: number | null = null,
    offset: number | null = null,
    reqConfig?: RequestConfiguration,
  ): Promise<PaginatedTiles> {
    const tiles = await ensureTimeout(async innerReqConfig => {
      const response = await this.fetchTiles(
        this.dataset.searchIndexUrl,
        bbox,
        fromTime,
        toTime,
        maxCount,
        offset,
        innerReqConfig,
      );
      return {
        tiles: response.data.tiles.map(tile => ({
          geometry: tile.dataGeometry,
          sensingTime: moment.utc(tile.sensingTime).toDate(),
          meta: {},
          links: this.getTileLinks(tile),
        })),
        hasMore: response.data.hasMore,
      };
    }, reqConfig);
    return tiles;
  }

  protected getTileLinks(tile: Record<string, any>): Link[] {
    return [
      {
        target: tile.originalId.replace('EODATA', '/eodata'),
        type: LinkType.CREODIAS,
      },
      {
        target: `https://finder.creodias.eu/files${tile.originalId.replace(
          'EODATA',
          '',
        )}/${tile.productName.replace('.SEN3', '')}-ql.jpg`,
        type: LinkType.PREVIEW,
      },
    ];
  }
}
