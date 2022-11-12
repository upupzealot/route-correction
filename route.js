export default class Route {
  constructor(points) {
    this.points = points;
    // 后续可使用 setDistanceFunc 传入地图组件的测距函数
    this.distanceFunc = null;

    if(!points.length) return;
    this.maxLng = points[0].lng;
    this.minLng = points[0].lng;
    this.maxLat = points[0].lat;
    this.minLat = points[0].lat;

    // 计算经纬度最大最小值
    for(let i = 1; i < points.length; i++) {
      const p = points[i];
      if (p.lng > this.maxLng) {
        this.maxLng = p.lng;
      }
      if (p.lng < this.minLng) {
        this.minLng = p.lng;
      }
      if (p.lat > this.maxlat) {
        this.maxlat = p.lat;
      }
      if (p.lat < this.minLat) {
        this.minLat = p.lat;
      }
    }
    // 包围盒中心点经纬度
    this.centerLng = (this.maxLng + this.minLng) / 2;
    this.centerLat = (this.maxLat + this.minLat) / 2;
    // 梯形正畸参数
    this.latCos = Math.cos( this.centerLat / 180 * Math.PI );
    this.latCos2 = this.latCos ** 2;
    this.latSin = Math.sin( this.centerLat / 180 * Math.PI );
    this.latSin2 = this.latSin ** 2;
    // 梯形正畸后近似地球半径
    this.RADIUS = ((6377830 /* 赤道半径 */ ** 2 * this.latCos2)
      + (6356908.8 /* 极半径 */ ** 2 * this.latSin2)) ** .5;

    if(points.length <= 1) return;
    this.segments = Array(points.length - 1);
    let distance = 0;
    for(let i = 0; i < points.length - 1; i++) {
      const p0 = this.points[i];
      const p1 = this.points[i + 1];
      const length = this.distanceBetween(p0, p1);
      // 计算路径朝向
      let direction = null;
      const dLng = (p1.lng - p0.lng) * this.latCos;
      const dLat = p1.lat - p0.lat;
      if(!dLng) { // 正北或正南
        if(dLat > 0) { // 正北
          direction = Math.PI / 2;
        } else if (dLat === 0) { //两点相同，错误情况
          direction = 0;
        } else { // dLat < 0，正南
          direction = - Math.PI / 2;
        }
      } else {
        direction = Math.atan(dLat / dLng);
        // 弧度角校准到 0~2 PI
        if(dLng < 0) { // 单位向量在第二第三象限的情况
          direction += Math.PI;
        }
        if(direction < 0) { // 单位向量在第四象限的情况
          direction += Math.PI;
        }
      }
      this.segments[i] = {
        p0, p1, // 线段两端点
        length, // 路径片段长度（米）
        distance, // 距离路径起点的距离（米）
        direction, // 路径朝向（弧度）
        directionInDegree: direction * 180 / Math.PI, // 路径朝向（角度）
      };
      distance += length;
    }
    this.totalDistance = distance;
  }
  setDistanceFunc(distanceFunc) {
    this.distanceFunc = distanceFunc;
    let distance = 0;
    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      segment.length = this.distanceBetween(segment.p0, segment.p1);
      segment.distance = distance;
      distance += segment.length;
    }
    this.totalDistance = distance;
  }

  // 两点间距离（米），自带计算方法
  distanceBetween0(p0, p1) {
    const dx2 = (p1.lng - p0.lng) ** 2 * this.latCos2;
    const dy2 = (p1.lat - p0.lat) ** 2;
    return ((dx2 + dy2) ** .5) / 180 * Math.PI * this.RADIUS;
  }
  // 两点间距离（米），可接受自定义方法
  distanceBetween(p0, p1) {
    if(this.distanceFunc) {
      return this.distanceFunc(p0, p1);
    } else {
      return this.distanceBetween0(p0, p1);
    }
  }

  // 点到线段的最近距离（角度平方）
  degDistance2ToSegment(point, segment) {
    const { lng: x, lat: y } = point;
    const {
      p0: { lng: x0, lat: y0 },
      p1: { lng: x1, lat: y1 },
    } = segment;
    let nearest = null;
    let r = 0;

    const cross = (x1 - x0) * (x - x0) * this.latCos2 + (y1 - y0) * (y - y0);
    if(cross < 0) {
      // 最近点为 p0
      nearest = { x: x0, y: y0 }
    } else {
      const d2 = (x1 - x0) ** 2 * this.latCos2 + (y1 - y0) ** 2;
      if(cross >= d2) {
        // 最近点为 p1
        nearest = { x: x1, y: y1 };
        r = 1;
      } else {
        // 最近在 p0 至 p1 之间，坐标为 (px, py)
        r = cross / d2; // 距离 p0 的比例
        const px = x0 + (x1 - x0) * r;
        const py = y0 + (y1 - y0) * r;
        nearest = { x: px, y: py }
      }
    }

    const dis2 = ((x - nearest.x) ** 2 * this.latCos2 + (y - nearest.y) ** 2);
    return {
      r, // 距离 p0 的比例
      nearest, // 最近点
      dis2, // 最近点的距离（角度的平方）
    };
  }

  // 将点位纠偏到路线上最近的点
  correct(point) {
    let minDis2 = Number.MAX_VALUE; // 
    let index = 0;
    let minDisRes = null;
    // 根据 dis2 最小值，筛选出最近的点
    for(let i = 0; i < this.segments.length; i++) {
      const disRes = this.degDistance2ToSegment(point, this.segments[i]);
      if(disRes.dis2 < minDis2) {
        minDis2 = disRes.dis2;
        index = i;
        minDisRes = disRes;
      }
    }

    const segment = this.segments[index]
    const distance = minDisRes.r * segment.length;
    return {
      index,
      segment,
      point: {
        r: minDisRes.r,
        distance,
        lng: minDisRes.nearest.x,
        lat: minDisRes.nearest.y,
      },
      distance: segment.distance + distance,
    };
  }

  // 根据行程（距起始点距离）反查坐标
  positionAt(distance) {
    let dis = Math.max(0, distance);
    for (let i = 0; i < this.segments.length; i++) {
      const { p0, p1, length,
        direction, directionInDegree } = this.segments[i];
      if(dis < length) {
        const r = dis / length;
        const lng = p0.lng * (1 - r) + p1.lng * r;
        const lat = p0.lat * (1 - r) + p1.lat * r;
        return {
          lng, lat,
          distance, direction, directionInDegree,
        }
      }
      dis -= length;
    }

    const last = this.segments[this.segments.length - 1];
    return {
      lng: last.lng,
      lat: last.lat,
      distance: this.totalDistance,
      direction: last.direction,
      directionInDegree: last.directionInDegree,
    }
  }
}
