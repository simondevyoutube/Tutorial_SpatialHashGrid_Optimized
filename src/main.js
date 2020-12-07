import {math} from './math.js';
import {spatial_grid} from './spatial-grid.js';

// Testing harness

const _NUM_CLIENTS = 100000;
const _ITERATIONS = 10000;

const _CLIENT_BOUNDS = [[-1000.0, -1000.0], [1000.0, 1000.0]];
const _CLIENT_DIMENSIONS = [100, 100];

const _CLIENT_POSITIONS = [];
for (let i = 0; i < _NUM_CLIENTS; ++i) {
  _CLIENT_POSITIONS.push(
      [
          math.rand_range(_CLIENT_BOUNDS[0][0], _CLIENT_BOUNDS[1][0]),
          math.rand_range(_CLIENT_BOUNDS[0][1], _CLIENT_BOUNDS[1][1])
      ]);
}

const _CLIENT_QUERIES = [];
for (let i = 0; i < _ITERATIONS; ++i) {
  const p = [
      math.rand_range(_CLIENT_BOUNDS[0][0], _CLIENT_BOUNDS[1][0]),
      math.rand_range(_CLIENT_BOUNDS[0][1], _CLIENT_BOUNDS[1][1])];

  _CLIENT_QUERIES.push(p);
}

const _CLIENT_MOVES = [];
for (let i = 0; i < _NUM_CLIENTS; ++i) {
  const p = [
      Math.random(),
      Math.random()];

  _CLIENT_MOVES.push(p);
}

class GridTester {
  constructor(gridClass) {
    this._grid = new gridClass(_CLIENT_BOUNDS, _CLIENT_DIMENSIONS);

    this._clients = [];
    for (let i = 0; i < _NUM_CLIENTS; ++i) {
      const client = this._grid.NewClient(
          _CLIENT_POSITIONS[i], [15, 15]
      );
      this._clients.push(client);
    }
  }

  Test_FindNearby() {
    const queryBounds = [15, 15];

    let startTime = performance.now();
    for (let i = 0; i < _ITERATIONS; ++i) {
      this._grid.FindNear(_CLIENT_QUERIES[i], queryBounds);
    }
    let totalTime = performance.now() - startTime;
    return totalTime;
  }

  Test_Update() {
    for (let i = 0; i < this._clients.length; ++i) {
      const c = this._clients[i];
      c.position[0] = _CLIENT_POSITIONS[i][0];
      c.position[1] = _CLIENT_POSITIONS[i][1];
      this._grid.UpdateClient(this._clients[i]);
    }
  
    let startTime = performance.now();
    for (let i = 0; i < this._clients.length; ++i) {
      const c = this._clients[i];
      c.position[0] += _CLIENT_MOVES[i][0];
      c.position[1] += _CLIENT_MOVES[i][1];
      this._grid.UpdateClient(this._clients[i]);
    }
    let totalTime = performance.now() - startTime;

    return totalTime;
  }
}


const gridSlow = new GridTester(spatial_grid.SpatialHash_Crap);
const gridFast = new GridTester(spatial_grid.SpatialHash_Slow);

console.log('Spatial Grid (Naive) - FindNearby: ' + gridSlow.Test_FindNearby() + 'ms');
console.log('Spatial Grid - FindNearby: ' + gridFast.Test_FindNearby() + 'ms');
console.log('----------------------------------');
console.log('Spatial Grid (Naive) - FindNearby: ' + gridSlow.Test_FindNearby() + 'ms');
console.log('Spatial Grid - FindNearby: ' + gridFast.Test_FindNearby() + 'ms');

console.log('----------------------------------');
console.log('----------------------------------');

console.log('Spatial Grid (Naive) - Update: ' + gridSlow.Test_Update() + 'ms');
console.log('Spatial Grid - Update: ' + gridFast.Test_Update() + 'ms');
console.log('----------------------------------');
console.log('Spatial Grid (Naive) - Update: ' + gridSlow.Test_Update() + 'ms');
console.log('Spatial Grid - Update: ' + gridFast.Test_Update() + 'ms');
