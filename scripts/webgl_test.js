function showError(errorText) {
    const errorBoxDiv = document.getElementById("demo-canvas-error-box");
    const errorTextElement = document.createElement('p');
    errorTextElement.innerText = errorText;
    errorBoxDiv.appendChild(errorTextElement);
    console.log(errorText);
}

function helloTriangle() {
    /** @type {HTMLCanvasElement|null} */
    const canvas = document.getElementById("demo-canvas");
    if (!canvas) {
        showError("Cannot get demo-canvas reference");
        return;
    }

    const gl = canvas.getContext("webgl2");
    if (!gl) {
        showError("This browser does not support WebGL 2 - This demo will not work");
        return;
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const triangleVertices = new Float32Array([
        0.0, 0.5, 1.0, 0.0, 0.0,
        -0.5, -0.5, 0.0, 1.0, 0.0,
        0.5, -0.5, 0.0, 0.0, 1.0,
    ]);

    const triangleGeoBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleGeoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

    const vertexShaderSource = `#version 300 es
        precision mediump float;

        in vec2 vertexPos;
        in vec3 vertexColor;

        out vec3 color;
        
        void main() {
            color = vertexColor;
            gl_Position = vec4(vertexPos, 0.0, 1.0);
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

        in vec3 color;

        out vec4 outColor;
        
        void main() {
            outColor = vec4(color, 1.0);
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

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        const linkError = gl.getProgramInfoLog(shaderProgram);
        showError(`Failed to link shader program: ${linkError}`);
        return;
    }

    const attribLocVertexPos = gl.getAttribLocation(shaderProgram, "vertexPos");
    const attribLocVertexColor = gl.getAttribLocation(shaderProgram, "vertexColor");

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl.clearColor(0.05, 0.05, 0.05, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(shaderProgram);
    gl.enableVertexAttribArray(attribLocVertexPos);
    gl.enableVertexAttribArray(attribLocVertexColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, triangleGeoBuffer);
    gl.vertexAttribPointer(attribLocVertexPos, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(attribLocVertexColor, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

try {
    helloTriangle();
} catch (e) {
    showError(`Uncaught JavaScript exception: ${e}`);
}
