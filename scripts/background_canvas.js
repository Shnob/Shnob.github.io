const vertexShaderSource = `#version 300 es
    precision lowp float;

    in vec2 pos;

    out vec2 Pos;

    uniform float aspectRatio;

    uniform vec2 i_pos[64];

    uniform float boidSize;

    void main() {
        Pos = pos * boidSize;
        gl_Position = vec4(
            vec2(1.0, aspectRatio) * pos * boidSize + i_pos[gl_InstanceID],
            0.0, 1.0
        );
    }
`;

const fragmentShaderSource = `#version 300 es
    precision lowp float;

    in vec2 Pos;

    out vec4 outColor;

    uniform float boidSize;

    uniform float aspectRatio;

    const vec3 COL_RED = vec3(174, 44, 64) / 255.0;

    void main() {
        outColor = vec4(0.0, 0.0, 0.0, 0.0);

        if (length(Pos) <= boidSize) {
            outColor = vec4(COL_RED, 1.0);
        }
    }
`;

function showError(errorText) {
    console.log(errorText);
}

/** @type {WebGL2RenderingContext} */
var gl;
/** @type {HTMLCanvasElement} */
var canvas;

const dT_ms = 20;
const dT = dT_ms / 1000;
const boidRad = 0.01;
const boidSenseRad = 0.2;
const boidSeparationFrac = 0.3;
const edgeSize = 1.0 + boidRad;
const boidMinSpeed = 0.5;
const boidMaxSpeed = 1.0;
const k_cohesion = 0.25;
const k_separation = 0.4;
const k_alignment = 0.003;
const k_boundary = 0.0;
const N = 50;

class Boid {
    constructor(x, y) {
        this.pos = glMatrix.vec2.fromValues(x, y);
        this.vel = glMatrix.vec2.fromValues(Math.random() - 0.5, Math.random() - 0.5)
        this.newVel = glMatrix.vec2.create();
    }

    doBoids(j, boids, canvas) {
        const senseRad = boidSenseRad;
        const separationRad = senseRad * boidSeparationFrac;

        this.newVel = glMatrix.vec2.clone(this.vel);

        const massCenter = glMatrix.vec2.create();
        const separationSum = glMatrix.vec2.create();
        const avgVelocity = glMatrix.vec2.create();
        let neighbors = 0;
        let separationNeighbors = 0;

        for (let i = 0; i < boids.length; i++) {
            if (i == j) continue;

            const distSq = glMatrix.vec2.sqrDist(this.pos, boids[i].pos);

            if (distSq > senseRad * senseRad) continue;

            neighbors++;

            glMatrix.vec2.add(massCenter, massCenter, boids[i].pos);
            glMatrix.vec2.add(avgVelocity, avgVelocity, boids[i].vel);

            if (distSq > separationRad * separationRad) continue;

            separationNeighbors++;

            glMatrix.vec2.add(separationSum, separationSum, this.pos);
            glMatrix.vec2.sub(separationSum, separationSum, boids[i].pos);
        }

        let force = glMatrix.vec2.create();

        if (neighbors != 0) {
            // Cohesion

            glMatrix.vec2.scale(massCenter, massCenter, 1.0 / neighbors);
            glMatrix.vec2.sub(massCenter, massCenter, this.pos);
            glMatrix.vec2.scale(massCenter, massCenter, k_cohesion);
            glMatrix.vec2.add(force, force, massCenter);

            // Alignment

            glMatrix.vec2.scale(avgVelocity, avgVelocity, 1.0 / neighbors);
            glMatrix.vec2.sub(avgVelocity, avgVelocity, this.vel);
            glMatrix.vec2.scale(avgVelocity, avgVelocity, k_alignment);
            glMatrix.vec2.add(force, force, avgVelocity);
        }

        if (separationNeighbors != 0) {
            // Separation

            glMatrix.vec2.scale(separationSum, separationSum, 1.0 / separationNeighbors);
            glMatrix.vec2.scale(separationSum, separationSum, k_separation);
            glMatrix.vec2.add(force, force, separationSum);
        }

        let insideBoundary = this.pos[0] > edgeSize || this.pos[0] < -edgeSize || this.pos[1] > edgeSize || this.pos[1] < -edgeSize;
        insideBoundary = false;

        if (insideBoundary) {
            let center = glMatrix.vec2.create();

            glMatrix.vec2.sub(center, center, this.pos);
            glMatrix.vec2.normalize(center, center)

            glMatrix.vec2.lerp(force, force, center, k_boundary);
        }

        glMatrix.vec2.add(this.newVel, this.newVel, force);
    }

    updateVel(dT) {
        glMatrix.vec2.copy(this.vel, this.newVel);

        let length = glMatrix.vec2.len(this.vel);

        if (length > boidMaxSpeed) {
            glMatrix.vec2.scale(this.vel, this.vel, boidMaxSpeed / length);
        } else if (length < boidMinSpeed) {
            glMatrix.vec2.scale(this.vel, this.vel, boidMinSpeed / length);
        }

        let vel_dT = glMatrix.vec2.create();

        glMatrix.vec2.scale(vel_dT, this.vel, dT);

        glMatrix.vec2.add(this.pos, this.pos, vel_dT);

        if (this.pos[0] > edgeSize || this.pos[0] < -edgeSize) {
            this.pos[0] *= -1;
        }
        if (this.pos[1] > edgeSize || this.pos[1] < -edgeSize) {
            this.pos[1] *= -1;
        }
    }
}

function navball() {
    /** @type {HTMLCanvasElement|null} */
    canvas = document.getElementById("background-canvas");
    if (!canvas) {
        showError("Cannot get demo-canvas reference");
        return;
    }

    gl = canvas.getContext("webgl2");
    if (!gl) {
        showError("This browser does not support WebGL 2 - This demo will not work");
        return;
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const quadVertices = new Float32Array([
        -1.0, -1.0, // Bottom Left
        1.0, -1.0, // Bottom Right
        -1.0, 1.0,  // Top Left
        1.0, 1.0,  // Top Right
    ]);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const compileError = gl.getShaderInfoLog(vertexShader);
        showError(`Failed to compile vertex shader: ${compileError}`);
        return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const compileError = gl.getShaderInfoLog(fragmentShader);
        showError(`Failed to compile fragment shader: ${compileError}`);
        return;
    }

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        const linkError = gl.getProgramInfoLog(shaderProgram);
        showError(`Failed to link shader program: ${linkError}`);
        return;
    }

    const attribLocVertexPos = gl.getAttribLocation(shaderProgram, "pos");
    const uniBoidSize = gl.getUniformLocation(shaderProgram, "boidSize");
    const uniAspectRatio = gl.getUniformLocation(shaderProgram, "aspectRatio");
    const uniI_pos = gl.getUniformLocation(shaderProgram, "i_pos");

    function setCanvasResolution() {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }
    setCanvasResolution();

    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    gl.viewport(0, 0, canvas.width, canvas.height);

    // This allows transparent fragments:
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(shaderProgram);
    gl.enableVertexAttribArray(attribLocVertexPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.vertexAttribPointer(attribLocVertexPos, 2, gl.FLOAT, false, 0, 0);

    const boids = [];

    function populateBoids() {
        for (let i = 0; i < N; i++) {
            boids.push(new Boid(Math.random() * 2 - 1, Math.random() * 2 - 1));
        }
        console.log(boids);
    }
    populateBoids();

    function updateBoids() {
        for (let i = 0; i < boids.length; i++) {
            boids[i].doBoids(i, boids, canvas);
        }

        for (let i = 0; i < boids.length; i++) {
            boids[i].updateVel(dT);
        }
    }

    function getBoidPositions() {
        const positions = new Float32Array(boids.length * 2);

        for (let i = 0; i < boids.length; i++) {
            positions[2 * i + 0] = boids[i].pos[0];
            positions[2 * i + 1] = boids[i].pos[1];
        }

        return positions;
    }

    gl.uniform1f(uniBoidSize, boidRad);

    function drawLoop() {
        setCanvasResolution();

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        updateBoids();

        const i_pos = getBoidPositions();
        gl.uniform2fv(uniI_pos, i_pos, 0, i_pos.length);
        gl.uniform1f(uniAspectRatio, canvas.width / canvas.height);

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, boids.length);
    }

    drawLoop();
    setInterval(drawLoop, dT_ms);
}

navball();

