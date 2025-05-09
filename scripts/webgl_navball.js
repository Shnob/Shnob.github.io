function showError(errorText) {
    console.log(errorText);
}

function navball() {
    /** @type {HTMLCanvasElement|null} */
    const canvas = document.getElementById("navball-canvas");
    if (!canvas) {
        showError("Cannot get navball-canvas reference");
        return;
    }

    const gl = canvas.getContext("webgl2");
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

    const vertexShaderSource = `#version 300 es
        precision mediump float;

        in vec2 pos;

        out vec2 Pos;

        void main() {
            Pos = pos;
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

        #define M_PI 3.1415926535897932384626433832795

        in vec2 Pos;

        out vec4 outColor;

        //uniform mat4 navballRotMat;

        const float POLE_SIZE = 0.2f;
        const float POLE_RIM = 0.0125f;
        const int LONG_COUNT = 12;
        const float LONG_WIDTH = 0.025f;
        const int LAT_COUNT = 6;
        const float LAT_WIDTH = 0.025f;

        const int LONG_TICK_COUNT = LONG_COUNT;
        const float LONG_TICK_LENGTH = 0.01f;
        const float LONG_TICK_WIDTH = 0.05f;
        const float LONG_TICK_CUTOFF = 0.3f;

        const int LAT_TICK_COUNT = LAT_COUNT;
        const float LAT_TICK_LENGTH = 0.01f;
        const float LAT_TICK_WIDTH = 0.05f;

        const float EQUATOR_WIDTH = LAT_WIDTH * 3.0;

        const vec3 COL_DARK = vec3(7, 11, 52) / 255.0;
        const vec3 COL_LIGHT = vec3(245, 245, 220) / 255.0;
        const vec3 COL_POLE = vec3(174, 44, 64) / 255.0;

        vec3 sphericalToCartesian(vec3 spherical) {
            return vec3(
                spherical.x * sin(spherical.y) * cos(spherical.z),
                spherical.x * sin(spherical.y) * sin(spherical.z),
                spherical.x * cos(spherical.y)
            );
        }

        vec3 cartesianToSpherical(vec3 cartesian) {
            float r = length(cartesian);

            float theta = acos(cartesian.z / r);

            float phi = sign(cartesian.y) * acos(cartesian.x / sqrt(cartesian.x * cartesian.x + cartesian.y * cartesian.y));
            if (phi < 0.0) {
                phi += M_PI * 2.0;
            }

            return vec3(r, theta, phi);
        }

        void main() {
            mat4 navballRotMat = mat4(1.0);
            outColor = vec4(0.0, 0.0, 0.0, 0.0);

            float r = length(Pos);

            if (r > 1.0) {
                return;
            }

            bool isLight = false;

            // theta : [0, pi]
            float theta = asin(r);

            // phi : [0, 2pi)
            float phi = -atan(Pos.y, Pos.x) + M_PI;

            vec3 coords = vec3(1.0, theta, phi);

            coords = sphericalToCartesian(coords);

            coords = (navballRotMat * vec4(coords, 1.0)).xyz;

            coords = cartesianToSpherical(coords);

            theta = coords.y;
            phi = coords.z;

            // A marker is a long or lat line or tick.
            // This is done so that they don't flip each others colors.
            bool isMarker = false;

            // Poles
            if (theta < POLE_SIZE || theta > M_PI - POLE_SIZE) {
                outColor = vec4(COL_POLE, 1.0);
                return;
            } else if (theta < POLE_SIZE + POLE_RIM || theta > M_PI - POLE_SIZE - POLE_RIM) {
                isMarker = true;
            }

            // Dark side
            if (phi < M_PI) {
                isLight = !isLight;
            }

            // Longitude lines
            float long_width_consistent = LONG_WIDTH / sin(theta);
            if (mod(phi + long_width_consistent / 2.0, M_PI * 2.0 / float(LONG_COUNT)) < long_width_consistent) {
                isMarker = true;
            }

            // Latitude lines
            if (mod(theta + LAT_WIDTH / 2.0, M_PI / float(LAT_COUNT)) < LAT_WIDTH) {
                isMarker = true;
            }

            // Longitude ticks
            // These ticks follow the latitude lines, but measure longitude.
            if (!(theta < LONG_TICK_CUTOFF || theta > M_PI - LONG_TICK_CUTOFF) &&
                    mod(theta + LONG_TICK_WIDTH / 2.0 + M_PI / 2.0 / float(LAT_COUNT), M_PI / float(LAT_COUNT)) < LONG_TICK_WIDTH) {
                float tick_len_consistent = LONG_TICK_LENGTH / sin(theta);
                if (mod(phi + tick_len_consistent / 2.0, M_PI * 2.0 / float(LONG_TICK_COUNT)) < tick_len_consistent) {
                    isMarker = true;
                }
            }

            // Latitude ticks
            // These ticks follow the longitude lines, but measure latitude.
            float tick_width_consistent = LAT_TICK_WIDTH / sin(theta);
            if (mod(phi + tick_width_consistent / 2.0 + M_PI / float(LONG_COUNT), M_PI * 2.0 / float(LONG_COUNT)) < tick_width_consistent) {
                if (mod(theta + LAT_TICK_LENGTH / 2.0, M_PI / float(LAT_TICK_COUNT)) < LAT_TICK_LENGTH) {
                    isMarker = true;
                }
            }

            // Equator line
            float theta_less_pi2 = theta - M_PI / 2.0;
            if (theta_less_pi2 < EQUATOR_WIDTH / 2.0 && theta_less_pi2 > -EQUATOR_WIDTH / 2.0) {
                isMarker = true;
            }

            if (isMarker) {
                isLight = !isLight;
            }

            // Equator cont.
            if (theta_less_pi2 < LAT_WIDTH / 2.0 && theta_less_pi2 > -LAT_WIDTH / 2.0) {
                isLight = !isLight;
            }

            vec3 col = isLight ? COL_LIGHT : COL_DARK;
            outColor = vec4(col, 1.0);
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

    const attribLocVertexPos = gl.getAttribLocation(shaderProgram, "pos");

    function setCanvasResolution() {
        canvas.width = canvas.clientWidth * window.devicePixelRatio;
        canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }
    setCanvasResolution();

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    gl.viewport(0, 0, canvas.width, canvas.height);

    // This allows transparent fragments:
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(shaderProgram);
    gl.enableVertexAttribArray(attribLocVertexPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.vertexAttribPointer(attribLocVertexPos, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

try {
    navball();
} catch (e) {
    showError(`Uncaught JavaScript exception: ${e}`);
}
