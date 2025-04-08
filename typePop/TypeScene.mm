//
//  TypeScene.m
//  typePop
//
//  Created by KimTaeseok on 2015. 11. 29..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//
#import "TypeScene.h"
#import "LoadShader.hpp"
#import <glm/glm.hpp>
#import <glm/gtc/matrix_transform.hpp>
#import <glm/gtc/type_ptr.hpp>
#import "LoadImage.h"

@implementation TypeScene

glm::mat4 r;
glm::mat4 rt;
glm::vec3 mp[2];
glm::vec3 eye;
GLint mLocation;


- (id) initWithFrame : (NSRect)frame{
    self=[super init];
    if(self){
        texDict=[[NSMutableDictionary alloc] init];
        self.frame=frame;
    }
    return self;
}
-(void) setRotation{
    for(int i=0; i<2; i++){
        float d=glm::distance(glm::vec2(mp[i]), glm::vec2(0));
        if(d>1.0f){
            mp[i]=mp[i]/d;
            d=1.0f;
        }
        mp[i][2]=glm::sqrt(1-d*d);
    }
    float angle=glm::acos(glm::dot(mp[0], mp[1]));
    if (angle==0) {
        return;
    }
    glm::vec3 axis=glm::normalize(glm::cross(mp[0], mp[1]));
    rt=glm::rotate(glm::mat4(1.0f), angle, axis);
}

- (void) loadTexture : (NSString*) fileName{
    if((bgTex=LoadImage([fileName UTF8String]))==0){
        NSLog(@"Load Texture Fail");
    }
}

- (void) loadContents{
    
    [self loadTexture:@"ANGMAP11.jpg"];
    
    currentGlyph=nil;
    
    FT_Library ft;
    if(FT_Init_FreeType(&ft)){
        NSLog(@"Init FreeType Error");
    }
    if(FT_New_Face(ft, "arial.ttf", 0, &face)){
        NSLog(@"New Face Error");
    }
    FT_Set_Pixel_Sizes(face, 0, 256);
    texDict=[Glyph loadDefaultGlyph:face];
    currentGlyph=[texDict objectForKey:@" "];
    
    glClearColor(0, 0.5, 0, 0);
    glClearStencil(0);
    glClearDepth(1.0f);
    
    ShaderInfo bgProgramInfo[]={
        {GL_VERTEX_SHADER, "simple.vert"},
        {GL_FRAGMENT_SHADER, "bg.frag"},
        {GL_NONE, NULL}
    };
    bgProgram=LoadShader(bgProgramInfo);
    glGenVertexArrays(1, &colVao);
    glBindVertexArray(colVao);
    GLuint colVbo;
    glGenBuffers(1, &colVbo);
    glBindBuffer(GL_ARRAY_BUFFER, colVbo);
    float colrect[]={
        0.0, -1, 1.0f,
        [Glyph keyWidth]/[Glyph keyBoardWidth]*2.0f, -1, 1.0f,
        [Glyph keyWidth]/[Glyph keyBoardWidth]*2.0f, 1, 1.0f,
        0, 1, 1.0f,
    };
    glBufferData(GL_ARRAY_BUFFER, sizeof(colrect), colrect, GL_STATIC_DRAW);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 0, (void*)0);
    glEnableVertexAttribArray(0);
    colPosLocation=glGetUniformLocation(bgProgram, "colPos");
    
    ShaderInfo info[]={
        {GL_VERTEX_SHADER, "simple.vert"},
        {GL_GEOMETRY_SHADER, "simple.geometry"},
        {GL_FRAGMENT_SHADER, "simple_shpere.frag"},
        {GL_NONE, NULL}
    };
    program=LoadShader(info);
    glUseProgram(program);
    mLocation=glGetUniformLocation(program, "m");
    rLocation=glGetUniformLocation(program, "r");
    eye=glm::vec3(0, 0, 4);
    float ascpect=self.frame.size.width/self.frame.size.height;
    glm::mat4 pv=glm::perspective(glm::pi<float>()/4.0f, ascpect, 0.01f, 10.0f)*glm::lookAt(eye, glm::vec3(0, 0, 0), glm::vec3(0, 1, 0));
    GLuint pvLocation=glGetUniformLocation(program, "pv");
    glUniformMatrix4fv(pvLocation, 1, GL_FALSE, glm::value_ptr(pv));
    eyeLocation=glGetUniformLocation(program, "eye");
    
    texLocation=glGetUniformLocation(program, "tex");
    glUniform1i(texLocation, 0);
}

- (void) drawGlyph : (Glyph*) glyph{
    for(int i=0; i<2; i++){
        glEnable(GL_STENCIL_TEST);
        glEnable(GL_DEPTH_TEST);
        glStencilFunc(GL_NEVER, 0, 0);
        glStencilOp(GL_INVERT, GL_KEEP, GL_KEEP);
        glBindVertexArray([[glyph.outline.vertexArray objectAtIndex:(NSUInteger)i] unsignedIntValue]);
        NSUInteger s=0;
        NSUInteger nC=[glyph.outline.contours count];
        
        
        for(int j=0; j<nC; j++){
            NSNumber* ne=[glyph.outline.contours objectAtIndex:j];
            NSUInteger e=[ne unsignedIntegerValue];
            glDrawArrays(GL_TRIANGLE_FAN, (GLsizei)s, (GLsizei) (e-s+1));
            s=e+1;
        }
        glStencilFunc(GL_EQUAL, 1, 1);
        glStencilOp(GL_ZERO, GL_ZERO, GL_ZERO);
        glBindVertexArray([[glyph.outline.rectArray objectAtIndex:(NSUInteger)i] unsignedIntValue]);
        glDrawArrays(GL_TRIANGLE_FAN, 0, 4);
    }
    
    glDisable(GL_STENCIL_TEST);
    glBindVertexArray(glyph.outline.wallArray);
    glDrawElements(GL_TRIANGLES, 6*(GLsizei)glyph.outline.points.count, GL_UNSIGNED_INT, (void*)0);
}

- (void) drawScene{
    glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT|GL_STENCIL_BUFFER_BIT);
    if (currentGlyph) {
        glDisable(GL_DEPTH_TEST);
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        glUseProgram(bgProgram);
        glBindVertexArray(colVao);
        glUniform3f(colPosLocation, [currentGlyph keyPos], 0, 0);
        glDrawArrays(GL_TRIANGLE_FAN, 0, 4);
        
        glUseProgram(program);
        
        glEnable(GL_DEPTH_TEST);
        glEnable(GL_TEXTURE_CUBE_MAP_SEAMLESS);
        glBindTexture(GL_TEXTURE_2D, bgTex);
        
        float angle=self.outputTime;
        glm::vec3 axis=glm::vec3(0, 1, 0);
        glm::mat4 rn=glm::rotate(glm::mat4(1.0f), angle, axis);
        glm::mat4 m=glm::translate(glm::mat4(1.0f), glm::vec3(0, 0, -1))*rt*r;
        glUniformMatrix4fv(mLocation, 1, GL_FALSE, glm::value_ptr(m));
        glUniformMatrix4fv(rLocation, 1, GL_FALSE, glm::value_ptr(rt*r));
        
        glUniform3f(eyeLocation, eye[0], eye[1], eye[2]);
        
        [self drawGlyph:currentGlyph];
    }
    glGetError();
}

- (void) loadIdentity{
    r=glm::mat4(1.0f);
}

- (void) keyDown:(NSString*)key{
    if([key characterAtIndex:0]==13){
        [self loadIdentity];
        return;
    }
    currentGlyph=[texDict objectForKey:key];
    if(currentGlyph==nil){
        if(FT_Load_Char(face, [key characterAtIndex:0], FT_LOAD_RENDER)){
            NSLog(@"Load Char Error");
        }
        Glyph* newGlyph=[[Glyph alloc] initWithFace:face];
        [newGlyph.outline loadVertex];
        [texDict setObject:newGlyph forKey:key];
        currentGlyph=newGlyph;
    }
}

-(void)mouseDown:(NSPoint)point{
    //NSLog(@"%f, %f", point.x/self.frame.size.width, point.y/self.frame.size.height);
    mp[0][0]=(point.x/self.frame.size.width*2.0-1.0f);
    mp[0][1]=(point.y/self.frame.size.height*2.0f-1.0f);
}
-(void)mouseUp:(NSPoint)point{
    r=rt*r;
    rt=glm::mat4(1.0f);
    //NSLog(@"%f, %f", point.x/self.frame.size.width, point.y/self.frame.size.height);
}
-(void)mouseDragged:(NSPoint)point{
    //NSLog(@"%f, %f", point.x/self.frame.size.width, point.y/self.frame.size.height);
    mp[1][0]=(point.x/self.frame.size.width*2.0-1.0f);
    mp[1][1]=(point.y/self.frame.size.height*2.0f-1.0f);
    [self setRotation];
}

@end
