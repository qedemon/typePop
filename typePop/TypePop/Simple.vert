#version 410 core
layout(location=0) in vec3 pos;
uniform MatrixBlock{
    uniform mat4 m;
    uniform mat4 r;
    uniform mat4 pv;
};
void main(){
    gl_Position=pv*m*vec4(pos, 1);
}