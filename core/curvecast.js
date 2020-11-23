import { Vector3 } from './three.js';

var maxSteps = 5;

var gravity = new Vector3(0, -1, 0);
var next = new Vector3();
var restore = {
    direction: new Vector3(),
    origin: new Vector3(),
};
var steps = [...Array(maxSteps + 2)].map(() => new Vector3());
var WorldUp = new Vector3(0, 1, 0);

// Performs a "curved" raycast

export default function CurveCast({
    intersects,
    raycaster,
}) {
    var { far: distance, ray: { direction, origin } } = raycaster;
    var points = [];
    var stride = 0.5;
    var hit = false;
    restore.direction.copy(direction);
    restore.origin.copy(origin);
    next.copy(origin);
    for (var i = 0; i < maxSteps; i += 1) {
        stride *= 2;
        origin.copy(next);
        points.push(steps[i].copy(origin));
        next
            .copy(origin)
            .addScaledVector(direction, stride)
            .addScaledVector(gravity, (stride * stride) * 0.05);
        direction
            .subVectors(next, origin);
        raycaster.far = i === maxSteps - 1 ? distance : direction.length();
        direction.normalize();
        hit = raycaster.intersectObjects(intersects)[0] || false;
        if (hit) {
            break;
        }
    }
    // If it has hit a wall
    if (hit && !hit.face.normal.equals(WorldUp)) {
        // Do one last bounce to the floor
        origin.copy(hit.point);
        points.push(steps[maxSteps].copy(origin));
        direction.copy(hit.face.normal);
        direction.y = -1;
        direction.normalize();
        raycaster.far = distance;
        hit = raycaster.intersectObjects(intersects)[0] || false;
        if (hit && !hit.face.normal.equals(WorldUp)) {
            hit = false;
        }
    }
    if (hit) {
        points.push(steps[maxSteps + 1].copy(hit.point));
    }
    direction.copy(restore.direction);
    origin.copy(restore.origin);
    raycaster.far = distance;
    return { hit, points };
}