//
//  LoadImage.c
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 5..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#include "LoadImage.h"
#include <string.h>
#include <FreeImage.h>
#ifdef __cplusplus
extern "C"{
#endif

const char *getExt (const char *fspec) {
    char *e = strrchr (fspec, '.');
    if (e == NULL)
        e = ""; // fast method, could also use &(fspec[strlen(fspec)]).
    return e;
}
    
GLuint LoadImage(const char* fileName){
    FREE_IMAGE_FORMAT format;
    int flag;
    char ext[100];
    strcpy(ext, getExt(fileName));
    //strlwr(ext);
    if (strcmp(ext, ".png")==0) {
        format=FIF_PNG;
        flag=PNG_DEFAULT;
    }
    else if(strcmp(ext, ".jpg")==0){
        format=FIF_JPEG;
        flag=JPEG_DEFAULT;
    }
    else{
        fprintf(stderr, "Unsupported file type.\n");
        return 0;
    }
    FIBITMAP *bitmap=FreeImage_Load(format, fileName, flag);
    if(bitmap){
        FIBITMAP* temp = bitmap;
        GLuint tex;
        unsigned width, height;
        
        bitmap = FreeImage_ConvertTo32Bits(bitmap);
        FreeImage_Unload(temp);
        width=FreeImage_GetWidth(bitmap);
        height=FreeImage_GetHeight(bitmap);
        
        glGetError();
        glGenTextures(1, &tex);
        glBindTexture(GL_TEXTURE_2D, tex);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, width, height, 0, GL_BGRA, GL_UNSIGNED_BYTE, FreeImage_GetBits(bitmap));
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        if (glGetError()!=GL_NO_ERROR) {
            fprintf(stderr, "Load Image Error\n");
        }
        FreeImage_Unload(bitmap);
        return tex;
    }
    return 0;
}

GLuint LoadCubeImage(const char* fileName){
    FREE_IMAGE_FORMAT format;
    int flag;
    char ext[100];
    strcpy(ext, getExt(fileName));
    //strlwr(ext);
    if (strcmp(ext, ".png")==0) {
        format=FIF_PNG;
        flag=PNG_DEFAULT;
    }
    else if(strcmp(ext, ".jpg")==0){
        format=FIF_JPEG;
        flag=JPEG_DEFAULT;
    }
    else{
        fprintf(stderr, "Unsupported file type.\n");
        return 0;
    }
    FIBITMAP *bitmap=FreeImage_Load(format, fileName, flag);
    if(bitmap){
        FIBITMAP* temp = bitmap;
        GLuint tex;
        unsigned width, height;
        
        bitmap = FreeImage_ConvertTo32Bits(bitmap);
        FreeImage_Unload(temp);
        width=FreeImage_GetWidth(bitmap);
        height=FreeImage_GetHeight(bitmap);
        
        glGetError();
        glGenTextures(1, &tex);
        glBindTexture(GL_TEXTURE_CUBE_MAP, tex);
        glPixelStorei(GL_UNPACK_ROW_LENGTH, width);
        GLint x[]={0, 2, 1, 1, 3, 1};
        GLint y[]={1, 1, 0, 2, 1, 1};
        for (int i=0; i<6; i++) {
            glGetError();
            GLint target=GL_TEXTURE_CUBE_MAP_POSITIVE_X+i;
            glPixelStorei(GL_UNPACK_SKIP_PIXELS, width/4*x[i]);
            glPixelStorei(GL_UNPACK_SKIP_ROWS, height/3*y[i]);
            glTexImage2D(target, 0, GL_RGBA8, width/4, height/3, 0, GL_BGRA, GL_UNSIGNED_BYTE, (void*)FreeImage_GetBits(bitmap));
        }
        glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        if (glGetError()!=GL_NO_ERROR) {
            fprintf(stderr, "Load Image Error\n");
        }
        FreeImage_Unload(bitmap);
        return tex;
    }
    return 0;
}

#ifdef __cpluspluc
}
#endif