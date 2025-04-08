//
//  TypePopScene.m
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 9..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "TypePopScene.h"
#import "GlyphPoint.h"
#import <glm/glm.hpp>
#import <glm/gtc/matrix_transform.hpp>
#import <glm/gtc/type_ptr.hpp>
#import <OpenGL/gl3.h>
#import "LoadShader.hpp"
#import "LoadImage.h"
#import "PushKey.h"

@implementation TypePopScene
- (id) initWithFrame:(NSRect)frame;{
    self=[super init];
    if(self){
        self.frame=frame;
    }
    return self;
}

-(NSArray*) loadPrograms{
    ShaderInfo info[]={
        {GL_VERTEX_SHADER, "Simple.vert"},
        {GL_FRAGMENT_SHADER, "Simple.frag"},
        {GL_NONE, NULL}
    };
    GLuint tempSimpleProgram=LoadShader(info);
    GLuint blockIndex=glGetUniformBlockIndex(tempSimpleProgram, "MatrixBlock");
    glUniformBlockBinding(tempSimpleProgram, blockIndex, 0);
    ShaderInfo sInfo[]={
        {GL_VERTEX_SHADER, "Sphere.vert"},
        {GL_GEOMETRY_SHADER, "Sphere.geometry"},
        {GL_FRAGMENT_SHADER, "Sphere.frag"},
        {GL_NONE, NULL}
    };
    GLuint tempSphereProgram=LoadShader(sInfo);
    blockIndex=glGetUniformBlockIndex(tempSphereProgram, "Uniforms");
    if (glGetError()!=GL_NO_ERROR) {
        NSLog(@"block");
    }
    else{
        glUniformBlockBinding(tempSphereProgram, blockIndex, 0);
    }
    return [NSArray arrayWithObjects:[NSNumber numberWithUnsignedInt:tempSimpleProgram], [NSNumber numberWithUnsignedInt:tempSphereProgram], nil];
}

-(void) loadContents{
    pushedKey=[[NSMutableDictionary alloc] init];
    
    glGenQueries(1, &query);
    enviromentMap=LoadImage("ANGMAP11.jpg");
    glBindTexture(GL_TEXTURE_2D, enviromentMap);
    NSArray* programs=[self loadPrograms];
    simpleProgram=[(NSNumber*) [programs objectAtIndex:0] unsignedIntValue];
    sphereMapProgram=[(NSNumber*) [programs objectAtIndex:1] unsignedIntValue];
    FT_Library ftLibrary;
    FT_Init_FreeType(&ftLibrary);
    if(FT_New_Face(ftLibrary, "LucidaGrande.ttc", 0, &enFace)){
        NSLog(@"New En Face Error");
    }
    FT_Set_Pixel_Sizes(enFace, 0, 64);
    if(FT_New_Face(ftLibrary, "AppleSDGothicNeo.ttc", 0, &koFace)){
        NSLog(@"New Ko Face Error");
    }
    FT_Set_Pixel_Sizes(koFace, 0, 64);
    glyphDict = [Glyph loadDefaultGlyphWithEnFace:enFace AndKoFace:koFace];
    if(FT_New_Face(ftLibrary, "Wingdings.ttf", 0, &enFace)){
        NSLog(@"New Wingdings Face Error");
    }
    FT_Set_Pixel_Sizes(enFace, 0, 64);
    wingdingDict = [Glyph loadDefaultGlyphWithEnFace:enFace AndKoFace:enFace];
    currGlyphDict=glyphDict;
    glyphPointArray = [[NSMutableArray alloc] init];
    
    glGenBuffers(1, &uMatrix);
    glBindBuffer(GL_UNIFORM_BUFFER, uMatrix);
    glBufferData(GL_UNIFORM_BUFFER, (16*3+4)*sizeof(GLfloat), NULL, GL_STREAM_DRAW);
    glBindBufferRange(GL_UNIFORM_BUFFER, 0, uMatrix, 0, (16*3+4)*sizeof(GLfloat));
    glClearColor(0, 0, 0.5, 0.0);
    
    float eye[3]={0.0f, 0.0f, 4.0f};
    float aspect=self.frame.size.height/self.frame.size.width;
    glm::mat4 pv=glm::frustum(-0.25f, 0.25f, -0.25f*aspect, 0.25f*aspect, 1.0f, 10.0f)*glm::lookAt(glm::vec3(eye[0], eye[1], eye[2]), glm::vec3(0, 0, 0.0f), glm::vec3(0, 1.0f, 0));
    glBufferSubData(GL_UNIFORM_BUFFER, 128, 16*sizeof(GLfloat), glm::value_ptr(pv));
    glBufferSubData(GL_UNIFORM_BUFFER, 192, 3*sizeof(GLfloat), eye);
}

-(void) drawGlyph: (Glyph*) glyph{
    glUseProgram(simpleProgram);
    for(int i=0; i<2; i++){
        glUseProgram(simpleProgram);
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
        glUseProgram(sphereMapProgram);
        glStencilFunc(GL_EQUAL, 1, 1);
        glStencilOp(GL_ZERO, GL_ZERO, GL_ZERO);
        glBindVertexArray([[glyph.outline.rectArray objectAtIndex:(NSUInteger)i] unsignedIntValue]);
        glDrawArrays(GL_TRIANGLE_FAN, 0, 4);
        
    }
    
    glDisable(GL_STENCIL_TEST);
    glBindVertexArray(glyph.outline.wallArray);
    glDrawElements(GL_TRIANGLES, 6*(GLsizei)glyph.outline.points.count, GL_UNSIGNED_INT, (void*)0);
}

-(void) updateGlyphPoints{
    NSMutableArray* addKey=[NSMutableArray array];
    @synchronized(pushedKey) {
        for(id key in pushedKey){
            PushKey* pk=pushedKey[key];
            pk.time+=6.0f*self.outputTimeDelta;
            if (pk.time>=1.0f) {
                pk.time-=1.0f;
                [addKey addObject:key];
            }
        }
    }
    
    for (NSString* key in addKey){
        [self addGlpyPointForKey:key];
    }
    NSMutableArray* discardedItem=[NSMutableArray array];
    for(GlyphPoint* gp in glyphPointArray){
        [gp update:self.outputTimeDelta];
        if (gp.pos[1]<-1.0f) {
            [discardedItem addObject:gp];
        }
    }
    [glyphPointArray removeObjectsInArray:discardedItem];
}

-(void) drawGlyphPoint:(GlyphPoint*)gp{
    float* pos=[gp pos];
    float* axis=[gp axis];
    glm::mat4 t=glm::translate(glm::mat4(1.0f), glm::vec3(pos[0], pos[1], pos[2]));
    glm::mat4 r=glm::rotate(glm::mat4(1.0f), [gp rotation], glm::vec3(axis[0], axis[1], axis[2]));
    glm::mat4 s=glm::scale(glm::mat4(1.0f), glm::vec3(1/15.0f, 1/15.0f, 1/15.0f));
    glBufferSubData(GL_UNIFORM_BUFFER, 0, 16*sizeof(GLfloat), glm::value_ptr(t*r*s));
    glBufferSubData(GL_UNIFORM_BUFFER, 64, 16*sizeof(GLfloat), glm::value_ptr(r));
    [self drawGlyph:[gp glyph]];
}

-(void) drawScene{
    glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT|GL_STENCIL_BUFFER_BIT);
    [self updateGlyphPoints];
    for(GlyphPoint* gp in glyphPointArray){
        [self drawGlyphPoint:gp];
    }
}

-(void) addGlpyPointForKey:(NSString*) key{
    Glyph* g=[currGlyphDict objectForKey:key];
    if(g){
        float u=(float)arc4random()/(float)UINT32_MAX;
        float v=(float)arc4random()/(float)UINT32_MAX;
        float w=(float)arc4random()/(float)UINT32_MAX;
        float theta=glm::pi<GLfloat>()*2.0f*u;
        float phi=glm::acos(2*v-1);
        float pos[3]={g.keyPos, -0.75, 0};
        float axis[3]={glm::cos(theta)*glm::sin(phi), glm::cos(theta)*glm::sin(phi), glm::cos(phi)};
        float posV[3]={0.1f*(2.0f*v-1.0f), 1.8f+0.5f*u, 0};
        float rotation=0;
        float rotV=glm::pi<GLfloat>()/2.0f*w+glm::pi<GLfloat>()*2.0f*(1-w);
        GlyphPoint* gp=[[GlyphPoint alloc] init];
        [gp setGlyph:g];
        [gp setPos:pos];
        [gp setPosV:posV];
        [gp setAxis:axis];
        [gp setRotation:rotation];
        [gp setRotV:rotV];
        
        int index=0;
        for(index=0; index<[glyphPointArray count]; index++){
            GlyphPoint* arrayGP=[glyphPointArray objectAtIndex:index];
            if (gp.glyph.outline.wallArray<=arrayGP.glyph.outline.wallArray) {
                break;
            }
        }
        [glyphPointArray insertObject:gp atIndex:index];
    }
    else{
        NSLog(@"%@", key);
    }
}

-(void) addPushedKey:(NSString*)key{
    @synchronized(pushedKey) {
        PushKey* pk=[pushedKey objectForKey:key];
        if (!pk) {
            pk=[[PushKey alloc] initWithKey:key];
            [pushedKey setObject:pk forKey:key];
        }
    }
}

-(void) removePushedKey:(NSString*)key{
    @synchronized(pushedKey) {
        PushKey* pk=[pushedKey objectForKey:key];
        if (pk) {
            [pushedKey removeObjectForKey:key];
        }
    }
}

-(void) keyDown:(NSString*)key{
    if ([key characterAtIndex:0]==13) {
        if (currGlyphDict==glyphDict) {
            currGlyphDict=wingdingDict;
        }
        else{
            currGlyphDict=glyphDict;
        }
    }
    else{
        for (int i=0; i<key.length; i++) {
            NSRange range;
            range.location=i;
            range.length=1;
            [self addPushedKey:[key substringWithRange:range]];
        }
    }
}
-(void) keyUp:(NSString*)key{
    for (int i=0; i<key.length; i++) {
        NSRange range;
        range.location=i;
        range.length=1;
        [self removePushedKey:[key substringWithRange:range]];
    }
}
-(void) mouseDown:(NSPoint) point{
    
}
-(void) mouseUp:(NSPoint) point{
    
}
-(void) mouseDragged:(NSPoint) point{
    
}

@end
