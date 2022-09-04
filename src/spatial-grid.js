import { math } from './math.js';

export const spatial_grid = (() => {
  
  class SpatialHash_Crap {
    constructor() {
      this._clients = new Set();
    }
  
    NewClient(position, dimensions) {
      const client = {
        position: position,
        dimensions: dimensions
      };
  
      this._Insert(client);
  
      return client;
    }
  
    UpdateClient(client) {
    }
  
    FindNear(position, dimensions) {
      const [x, y] = position;
      const [w, h] = dimensions;
  
      const searchBox = {
        position: position,
        dimensions: dimensions,
      };

      const _Overlaps = (a, b) => {
        const [aw, ah] = a.dimensions;
        const [bw, bh] = b.dimensions;
        return (Math.abs(a.position[0] - b.position[0]) * 2 < (aw + bw)) &&
               (Math.abs(a.position[1] - b.position[1]) * 2 < (ah + bh));
      };

      const results = [];

      for (let c of this._clients) {
        if (_Overlaps(searchBox, c)) {
          results.push(c);
        }
      }

      return results;
    }
  
    _Insert(client) {
      this._clients.add(client);
    }
  
    Remove(client) {
      this._clients.delete(client);
    }
  }

   class SpatialHash_SlowFixed {
    constructor(bounds, dimensions) {
      this._cells = new Map();
      this._dimensions = dimensions;
      this._bounds = bounds;
    }
  
    _GetCellIndex(position) {
      const x = math.sat((position[0] - this._bounds[0][0]) / (
          this._bounds[1][0] - this._bounds[0][0]));
      const y = math.sat((position[1] - this._bounds[0][1]) / (
          this._bounds[1][1] - this._bounds[0][1]));
  
      const xIndex = Math.floor(x * (this._dimensions[0] - 1));
      const yIndex = Math.floor(y * (this._dimensions[1] - 1));
  
      return [xIndex, yIndex];
    }

    _Key(i1, i2) {
      return i1 + '.' + i2;
    }
  
    NewClient(position, dimensions) {
      const client = {
        position: position,
        dimensions: dimensions,
        indices: null,
      };
  
      this._Insert(client);
  
      return client;
    }
  
    UpdateClient(client) {
      this.Remove(client);
      this._Insert(client);
    }
  
    FindNear(position, bounds) {
      const [x, y] = position;
      const [w, h] = bounds;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      const clients = new Set();
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);

          const cellClients = this._cells.get(k);
          if (cellClients) {
            for (let v of cellClients) {
              clients.add(v);
            }
          }
        }
      }
      return clients;
    }
  
    _Insert(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      client.indices = [i1, i2];
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);
          const cellClientsCheck = this._cells.get(k);
          // NOTE: calling .get() on a Map is apparently currently (Sept 2022)
          // faster in V8 than .get on a Set (https://stackoverflow.com/a/69338420)
          const cellClients = cellClientsCheck || new Map();
          cellClients.set(client, true);
          if (!cellClientsCheck)
            this._cells.set(k, cellClients);
        }
      }
    }
  
    Remove(client) {
      const [i1, i2] = client.indices;
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);
          this._cells.get(k)?.delete(client);
        }
      }
    }
  }

  class SpatialHash_Fast {
    constructor(bounds, dimensions) {
      const [x, y] = dimensions;
      this._cells = [...Array(x)].map(_ => [...Array(y)].map(_ => (null)));
      this._dimensions = dimensions;
      this._bounds = bounds;
      this._queryIds = 0;
    }
  
    _GetCellIndex(position) {
      const x = math.sat((position[0] - this._bounds[0][0]) / (
          this._bounds[1][0] - this._bounds[0][0]));
      const y = math.sat((position[1] - this._bounds[0][1]) / (
          this._bounds[1][1] - this._bounds[0][1]));
  
      const xIndex = Math.floor(x * (this._dimensions[0] - 1));
      const yIndex = Math.floor(y * (this._dimensions[1] - 1));
  
      return [xIndex, yIndex];
    }
  
    NewClient(position, dimensions) {
      const client = {
        position: position,
        dimensions: dimensions,
        _cells: {
          min: null,
          max: null,
          nodes: null,
        },
        _queryId: -1,
      };
  
      this._Insert(client);
  
      return client;
    }
  
    UpdateClient(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      if (client._cells.min[0] == i1[0] &&
          client._cells.min[1] == i1[1] &&
          client._cells.max[0] == i2[0] &&
          client._cells.max[1] == i2[1]) {
        return;
      }
  
      this.Remove(client);
      this._Insert(client);
    }
  
    FindNear(position, bounds) {
      const [x, y] = position;
      const [w, h] = bounds;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      const clients = [];
      const queryId = this._queryIds++;
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          let head = this._cells[x][y];
  
          while (head) {
            const v = head.client;
            head = head.next;
  
            if (v._queryId != queryId) {
              v._queryId = queryId;
              clients.push(v);
            }
          }
        }
      }
      return clients;
    }
  
    _Insert(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      const nodes = [];
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        nodes.push([]);
  
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const xi = x - i1[0];
  
          const head = {
            next: null,
            prev: null,
            client: client,
          };
  
          nodes[xi].push(head);
  
          head.next = this._cells[x][y];
          if (this._cells[x][y]) {
            this._cells[x][y].prev = head;
          }
  
          this._cells[x][y] = head;
        }
      }
  
      client._cells.min = i1;
      client._cells.max = i2;
      client._cells.nodes = nodes;
    }
  
    Remove(client) {
      const i1 = client._cells.min;
      const i2 = client._cells.max;
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const xi = x - i1[0];
          const yi = y - i1[1];
          const node = client._cells.nodes[xi][yi];
  
          if (node.next) {
            node.next.prev = node.prev;
          }
          if (node.prev) {
            node.prev.next = node.next;
          }
  
          if (!node.prev) {
            this._cells[x][y] = node.next;
          }
        }
      }
  
      client._cells.min = null;
      client._cells.max = null;
      client._cells.nodes = null;
    }
  }

   class SpatialHash_SlowFixedOptimized {
    constructor(bounds, dimensions) {
      this._cells = new Map();

      // NOTE: can preallocate everything, but it's the same perf as not.
      // Probably because the test data is so uniform.

      // for (let x = 0; x < dimensions[0]; x++) {
      //   for (let y = 0; y < dimensions[1]; y++) {
      //     this._cells.set(this._Key(x, y), new Set());
      //   }
      // }

      this._dimensions = dimensions;
      this._bounds = bounds;
      this._queryIds = -1;
    }
  
    _GetCellIndex(position) {
      const x = math.sat((position[0] - this._bounds[0][0]) / (
          this._bounds[1][0] - this._bounds[0][0]));
      const y = math.sat((position[1] - this._bounds[0][1]) / (
          this._bounds[1][1] - this._bounds[0][1]));
  
      const xIndex = Math.floor(x * (this._dimensions[0] - 1));
      const yIndex = Math.floor(y * (this._dimensions[1] - 1));
  
      return [xIndex, yIndex];
    }

    _Key(i1, i2) {
      return i1 + '.' + i2;
    }
  
    NewClient(position, dimensions) {
      const client = {
        position: position,
        dimensions: dimensions,
        indices: null,
        _queryId: -1,
        _cells: {
          min: null,
          max: null,
        }
      };
  
      this._Insert(client);
  
      return client;
    }
  
    UpdateClient(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      if (client._cells.min[0] == i1[0] &&
          client._cells.min[1] == i1[1] &&
          client._cells.max[0] == i2[0] &&
          client._cells.max[1] == i2[1]) {
        return;
      }

      this.Remove(client);
      this._Insert(client);
    }
  
    FindNear(position, bounds) {
      const [x, y] = position;
      const [w, h] = bounds;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      const clients = [];
      const queryId = this._queryIds++;
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);

          const cellClients = this._cells.get(k);
          if (cellClients) {
            for (let v of cellClients) {
              if (v._queryId !== queryId) {
                v._queryId = queryId;
                clients.push(v);
              }
            }
          }
        }
      }
      return clients;
    }
  
    _Insert(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      client.indices = [i1, i2];
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);
          const cellClientsCheck = this._cells.get(k);
          const cellClients = cellClientsCheck || new Set();
          cellClients.add(client);
          if (!cellClientsCheck)
            this._cells.set(k, cellClients);
        }
      }

      client._cells.min = i1;
      client._cells.max = i2;
    }
  
    Remove(client) {
      const [i1, i2] = client.indices;
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);
          this._cells.get(k)?.delete(client);
        }
      }
    }
  }

  


  /**
   * @typedef {Object} ClientWithNumericId
   * @property {[number, number]} position;
   * @property {[[number, number], [number, number]]} dimensions;
   * @property {[number, number] | null} indices
   * @property {number} id
   * @property {number} _queryId
   * @property {{ min: null | [number, number]; max: null | [number, number]; }} _cells
   **/


  /**
   * @typedef {((ClientWithNumericId)[] | undefined)[]} ArrayCellLookup
   */

   class SpatialHash_FlatArray {
    constructor(bounds, dimensions) {
      const [x, y] = dimensions;

      /** @type {ArrayCellLookup} */
      this._cells = new Array(dimensions[0] * dimensions[1]);
      this._dimensions = dimensions;
      this._bounds = bounds;

      this._lastId = 0;
      this._queryIds = 0;
    }
  
    _GetCellIndex(position) {
      const x = math.sat((position[0] - this._bounds[0][0]) / (
          this._bounds[1][0] - this._bounds[0][0]));
      const y = math.sat((position[1] - this._bounds[0][1]) / (
          this._bounds[1][1] - this._bounds[0][1]));
  
      const xIndex = Math.floor(x * (this._dimensions[0] - 1));
      const yIndex = Math.floor(y * (this._dimensions[1] - 1));
  
      return [xIndex, yIndex];
    }

    /**
     * 
     * @param {number} i1 
     * @param {number} i2 
     * @returns {number}
     */
    _Key(i1, i2) {
      return i1 * this._dimensions[0] + i2;
    }
  
    NewClient(position, dimensions) {
      /** @type ClientWithNumericId */
      const client = {
        position: position,
        dimensions: dimensions,
        indices: null,
        id: this._lastId++,
        _queryId: -1,
        _cells: {
          min: null,
          max: null,
        },
      };
  
      this._Insert(client);
  
      return client;
    }
  
    UpdateClient(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      if (client._cells.min[0] == i1[0] &&
          client._cells.min[1] == i1[1] &&
          client._cells.max[0] == i2[0] &&
          client._cells.max[1] == i2[1]) {
        return;
      }

      this.Remove(client);
      this._Insert(client);
    }
  
    FindNear(position, bounds) {
      const [x, y] = position;
      const [w, h] = bounds;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      const clients = [];
  
      const queryId = this._queryIds++;

      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);

          const cellClients = this._cells[k];
          if (cellClients) {
            for (let i = 0; i < cellClients.length; i++) {
              const v = cellClients[i];
              if (v._queryId != queryId) {
                v._queryId = queryId;
                clients.push(v);
              }
            }
          }
        }
      }
      return clients;
    }
  
    _Insert(client) {
      const [x, y] = client.position;
      const [w, h] = client.dimensions;
  
      const i1 = this._GetCellIndex([x - w / 2, y - h / 2]);
      const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
  
      client.indices = [i1, i2];
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);
          /** @type {ClientWithNumericId[]} */
          const cellClients = this._cells[k] || [];
          const found = cellClients.find(c => c.id === client.id);
          if (!found) {
            cellClients.push(client)
          }
          this._cells[k] = cellClients;
        }
      }
      
      client._cells.min = i1;
      client._cells.max = i2;
    }
  
    /**
     * 
     * @param {ClientWithNumericId} client 
     */
    Remove(client) {
      if (!client.indices) return;
      const [i1, i2] = client.indices;
  
      for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
        for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
          const k = this._Key(x, y);

            const cellClients = this._cells[k];
            if (!cellClients) continue;
            for (let i = 0; i < cellClients.length; i++) {
              if (cellClients[i].id === client.id) {
                if (i === cellClients.length - 1) {
                  cellClients.pop();
                } else {
                  const last = cellClients.pop();
                  if (last)
                    cellClients[i] = last;
                }
              }
            }
        }
      }
    }
  }

  return {
    SpatialHash_Crap: SpatialHash_Crap,
    SpatialHash_SlowFixed,
    SpatialHash_Fast: SpatialHash_Fast,
    SpatialHash_SlowFixedOptimized,
    SpatialHash_FlatArray
  };

})();