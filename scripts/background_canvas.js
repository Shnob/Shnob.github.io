function showError(errorText) {
    console.log(errorText);
}

/** @type {WebGL2RenderingContext} */
var gl;

class Stars {
    constructor(canvas) {
        this.canvas = canvas;

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.scale = 0.02;
        let aspectRatio = this.canvas.width / this.canvas.height;

        const triangleVertices = new Float32Array([
            0.0 * this.scale / aspectRatio, 1.0 * this.scale, 0.5, 1.0,
            -1.0 * this.scale / aspectRatio, 0.0 * this.scale, 0.0, 0.5,
            1.0 * this.scale / aspectRatio, 0.0 * this.scale, 1.0, 0.5,
            0.0 * this.scale / aspectRatio, -1.0 * this.scale, 0.5, 0.0,
        ]);

        const triangleGeoBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleGeoBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.DYNAMIC_DRAW);

        const vertexShaderSource = `#version 300 es
            precision mediump float;

            in vec2 vertexPos;
            in vec2 vertexUv;
            
            uniform vec2[64] instanceOffsets;

            out vec2 uv;
            
            void main() {
                uv = vertexUv;

                vec2 pos = vertexPos + instanceOffsets[gl_InstanceID];

                gl_Position = vec4(pos, 0.0, 1.0);
            }
        `;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            const compileError = gl.getShaderInfoLog(vertexShader);
            showError(`Failed to compile vertex shader: ${compileError}`);
            return;
        }

        const fragmentShaderSource = `#version 300 es
            precision mediump float;

            uniform sampler2D tex;

            in vec2 uv;

            out vec4 outColor;
            
            void main() {
                outColor = texture(tex, uv);
            }
        `;

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            const compileError = gl.getShaderInfoLog(fragmentShader);
            showError(`Failed to compile fragment shader: ${compileError}`);
            return;
        }

        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, vertexShader);
        gl.attachShader(this.shaderProgram, fragmentShader);
        gl.linkProgram(this.shaderProgram);
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            const linkError = gl.getProgramInfoLog(this.shaderProgram);
            showError(`Failed to link shader program: ${linkError}`);
            return;
        }

        const attribLocVertexPos = gl.getAttribLocation(this.shaderProgram, "vertexPos");
        const attribLocVertexUv = gl.getAttribLocation(this.shaderProgram, "vertexUv");

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Default texture, while image loads:
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        // Load image asynchronously:
        const image = new Image();
        image.src = "assets/star.png";
        image.addEventListener('load', function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
        });

        gl.useProgram(this.shaderProgram);
        gl.enableVertexAttribArray(attribLocVertexPos);
        gl.enableVertexAttribArray(attribLocVertexUv);

        gl.bindBuffer(gl.ARRAY_BUFFER, triangleGeoBuffer);
        gl.vertexAttribPointer(attribLocVertexPos, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.vertexAttribPointer(attribLocVertexUv, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

        this.uniInstanceOffsets = gl.getUniformLocation(this.shaderProgram, "instanceOffsets");

        this.calculateOffsets();
    }

    calculateOffsets() {
        this.instanceOffsets = new Float32Array([
            0.0, 0.0,
            0.5, 0.5,
            -0.5, 0.5,
        ]);
    }

    draw() {
        gl.useProgram(this.shaderProgram);
        gl.bindVertexArray(this.vao);

        let aspectRatio = this.canvas.width / this.canvas.height;

        const triangleVertices = new Float32Array([
            0.0 * this.scale / aspectRatio, 1.0 * this.scale, 0.5, 1.0,
            -1.0 * this.scale / aspectRatio, 0.0 * this.scale, 0.0, 0.5,
            1.0 * this.scale / aspectRatio, 0.0 * this.scale, 1.0, 0.5,
            0.0 * this.scale / aspectRatio, -1.0 * this.scale, 0.5, 0.0,
        ]);

        gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.DYNAMIC_DRAW);

        gl.uniform2fv(this.uniInstanceOffsets, this.instanceOffsets);

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.instanceOffsets.length / 2);
    }
}

function helloTriangle() {
    /** @type {HTMLCanvasElement|null} */
    const canvas = document.getElementById("background-canvas");
    if (!canvas) {
        showError("Cannot get demo-canvas reference");
        return;
    }

    gl = canvas.getContext("webgl2");
    if (!gl) {
        showError("This browser does not support WebGL 2 - This demo will not work");
        return;
    }

    function setCanvasResolution() {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }
    setCanvasResolution();

    gl.clearColor(0.1, 0.1, 0.13, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // This allows transparent fragments:
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const stars = new Stars(canvas);

    function drawLoop() {
        setCanvasResolution();

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

        stars.draw();
    }

    drawLoop();
    setInterval(drawLoop, 20);
}

try {
    helloTriangle();
} catch (e) {
    showError(`Uncaught JavaScript exception: ${e}`);
}
