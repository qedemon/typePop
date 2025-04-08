#version 410 core
out vec4 fcolor;
uniform sampler2D tex;
in vec3 posFromEye;
in vec4 norm;
void main(){
    vec3 point=reflect(normalize(posFromEye), norm.xyz);
    vec2 uv=0.5*normalize(point+vec3(0, 0, 1)).xy+vec2(0.5, 0.5);
    fcolor=texture(tex, uv);
}