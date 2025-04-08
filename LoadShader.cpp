//
//  LoadShader.cpp
//  clParticle
//
//  Created by KimTaeseok on 2015. 11. 15..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#include "LoadShader.hpp"
#include <iostream>
#include <sstream>
#include <fstream>
#include <vector>

using namespace std;

string LoadSourceCode(const char* fileName){
    string sourceCode;
    ifstream fSource(fileName);
    if(!fSource.is_open()){
        cerr<<"Cannot open "<<fileName<<endl;
        return sourceCode;
    }
    stringstream sSource;
    sSource<<fSource.rdbuf();
    fSource.close();
    sourceCode=sSource.str();
    return sourceCode;
}

GLuint LoadShader(ShaderInfo* info){
    GLuint program=0;
    size_t nShader=0;
    vector<string*> sCodes;
    vector<GLuint> shaderObjects;
    while (info[nShader].shaderType!=GL_NONE) {
        string sCode=LoadSourceCode(info[nShader].fileName);
        if (sCode.length()==0) {
            return 0;
        }
        string* pCode=new string(sCode);
        sCodes.push_back(pCode);
        nShader++;
    }
    
    program=glCreateProgram();
    for (int i=0; i<nShader; i++) {
        GLuint shaderObject;
        shaderObject=glCreateShader(info[i].shaderType);
        shaderObjects.push_back(shaderObject);
        GLint len=(GLint)sCodes[i]->length();
        const char* pCode=sCodes[i]->c_str();
        glShaderSource(shaderObject, 1, &pCode, &len);
        glCompileShader(shaderObject);
        GLint compileStatus;
        glGetShaderiv(shaderObject, GL_COMPILE_STATUS, &compileStatus);
        if (compileStatus!=GL_TRUE) {
            string buildLog;
            GLint logLen;
            glGetShaderiv(shaderObject, GL_INFO_LOG_LENGTH, &logLen);
            buildLog.resize(logLen);
            glGetShaderInfoLog(shaderObject, logLen, &logLen, (GLchar*)buildLog.data());
            cerr<<"---"<<info[i].fileName<<"---"<<endl;
            cerr<<buildLog<<endl;
            cerr<<"------"<<endl;
        }
        else{
            glAttachShader(program, shaderObject);
        }
    }
    
    glLinkProgram(program);
    GLint linked;
    glGetProgramiv(program, GL_LINK_STATUS, &linked);
    if(linked==GL_FALSE){
        cerr<<"Program Link Failed"<<endl;
        int nLinkLog;
        glGetProgramiv(program, GL_INFO_LOG_LENGTH, &nLinkLog);
        string linkLog;
        linkLog.resize(nLinkLog);
        glGetProgramInfoLog(program, nLinkLog, &nLinkLog, (GLchar*)linkLog.data());
        cerr<<linkLog<<endl;
        glDeleteProgram(program);
    }
    
    for(int i=0; i<nShader; i++){
        delete sCodes[i];
        if(shaderObjects.size()>i){
            if (glIsShader(shaderObjects[i])) {
                glDeleteShader(shaderObjects[i]);
            }
        }
    }
    return program;
}

cl_program LoadCLProgram(cl_context context , const cl_device_id* devices, cl_int nDevice, const char* fileName){
    cl_program program;
    string sCode=LoadSourceCode(fileName);
    const char* pCode=sCode.c_str();
    size_t len=sCode.length();
    cl_int errNum;
    program=clCreateProgramWithSource(context, 1, &pCode, &len, &errNum);
    if (errNum!=CL_SUCCESS) {
        cerr<<"Create Program Error"<<endl;
        return 0;
    }
    errNum=clCompileProgram(program, nDevice, devices, NULL, 0, NULL, NULL, NULL, NULL);
    if (errNum!=CL_SUCCESS) {
        for(int i=0; i<nDevice; i++){
            string deviceName;
            size_t len;
            clGetDeviceInfo(devices[i], CL_DEVICE_NAME, 0, NULL, &len);
            deviceName.resize(len);
            clGetDeviceInfo(devices[i], CL_DEVICE_NAME, len, (void*)deviceName.data(), NULL);
            clGetProgramBuildInfo(program, devices[i], CL_PROGRAM_BUILD_LOG, 0, NULL, &len);
            string buildLog;
            buildLog.resize(len);
            clGetProgramBuildInfo(program, devices[i], CL_PROGRAM_BUILD_LOG, len, (void*) buildLog.data(), NULL);
            cerr<<"---"<<deviceName<<"---"<<endl<<buildLog<<endl<<"------"<<endl;
        }
        return 0;
    }
    errNum=clBuildProgram(program, nDevice, devices, NULL, NULL, NULL);
    if(errNum){
        cerr<<"BuildProgram"<<endl;
        return 0;
    }
    return program;
}