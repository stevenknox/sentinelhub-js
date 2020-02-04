import axios from 'axios';

import { GetMapParams, ApiType, Tile, PaginatedTiles, Flyover } from 'src/layer/const';
import { BBox } from 'src/bbox';
import { Dataset } from 'src/layer/dataset';

export class AbstractLayer {
  public title: string | null = null;
  public description: string | null = null;
  public readonly dataset: Dataset | null = null;

  public constructor(title: string | null = null, description: string | null = null) {
    this.title = title;
    this.description = description;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getMap(params: GetMapParams, api: ApiType): Promise<Blob> {
    switch (api) {
      case ApiType.WMS:
        const url = this.getMapUrl(params, api);
        const response = await axios.get(url, { responseType: 'blob' });
        return response.data;
      default:
        const className = this.constructor.name;
        throw new Error(`API type "${api}" not supported in ${className}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getMapUrl(params: GetMapParams, api: ApiType): string {
    throw new Error('Not implemented');
  }

  public findTiles(
    bbox: BBox, // eslint-disable-line @typescript-eslint/no-unused-vars
    fromTime: any, // eslint-disable-line @typescript-eslint/no-unused-vars
    toTime: any, // eslint-disable-line @typescript-eslint/no-unused-vars
    maxCount?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    offset?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<PaginatedTiles> {
    throw new Error('Not implemented yet');
  }

  public groupTilesByFlyovers(tiles: Tile[]): Flyover[] {
    if (!this.dataset || !this.dataset.orbitTimeMilliSeconds) {
      throw new Error('Orbit time is needed for grouping tiles into flyovers.');
    }

    let orbitTimeMS = this.dataset.orbitTimeMilliSeconds;
    let flyovers = [] as Flyover[];

    let j = 0;
    for (let i = 0; i < tiles.length; i++) {
      if (!tiles[i - 1]) {
        flyovers[j] = {
          tiles: [tiles[i]],
          startTime: tiles[i].sensingTime,
          endTime: tiles[i].sensingTime,
        };
      } else {
        const prevDateMS = new Date(tiles[i - 1].sensingTime).getTime();
        const currDateMS = new Date(tiles[i].sensingTime).getTime();
        const diffMS = prevDateMS - currDateMS;

        if (diffMS < orbitTimeMS) {
          flyovers[j].tiles.push(tiles[i]);
          flyovers[j].endTime = tiles[i].sensingTime;
        } else {
          j++;
          flyovers[j] = {
            tiles: [tiles[i]],
            startTime: tiles[i].sensingTime,
            endTime: tiles[i].sensingTime,
          };
        }
      }
    }
    return flyovers;
  }
}
