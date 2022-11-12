## Point 坐标点类
| 字段 | 类型 | 描述 |
|-----|------|-----|
| lng | Number | 经度 |
| lat | Number | 纬度 |

## Segment 路径线段类
| 字段 | 类型 | 描述 |
|-----|------|-----|
| p0 | Point | 起始点 |
| p1 | Point | 结束点 |
| length | Number | 路径线段长度（米） |
| distance | Number | p0点距离路径起始点的距离 |
| direction | Number | 路径朝向（弧度） |
| directionInDegree | Number | 路径朝向（角度） |

## Route 路线类
| 字段 | 类型 | 描述 |
|-----|------|-----|
| points | [Point] | 折线点 |
| segments | [Segment] | 路径线段 |
| totalDistance | Number | 总长度(米) |
| maxLng / minLng | Number | 最大最小经度 |
| maxLat / minLat | Number | 最大最小纬度 |、
| centerLng / centerLat | Number | 包围盒中心经纬度 |
| RADIUS | Number | 地球半径（包围盒做梯形正畸后近似） |
### 成员方法 
#### correct 方法
`const res = correct(point);`
##### 入参
| 字段 | 类型 | 描述 |
|-----|------|-----|
| point | Point | 计算 point 点到当前路径的最近点位 |
##### 返回值
返回值 res 为一个对象，其中各属性如下
| 字段 | 类型 | 描述 |
|-----|------|-----|
| point | Point | 最近点 |
| point.r | Number | 最近点在线段上的位置，范围 0~1。0 代表最近点位于 p0，1 代表最近点位于 p1, 0.5 代表位于线段中点 |
| point.lng / point.lat | Number | 最近点的经纬度 |
| point.distance | Number | 最近点距离线段 p0 点的距离（米） |
| segment | Segment | 最近点所在线段 |
| index | Number | 最近点所在线段在 segments 数组中的下标 |
| distance | Number | 最近点距离路径起始点的距离（米） |
