//
//  GLyphOutline.m
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 3..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "GlyphOutline.h"
#import FT_OUTLINE_H

@implementation GlyphOutline

static int PathMoveTo(const FT_Vector *to, void *user){
    GlyphOutline* outline=(__bridge GlyphOutline*) user;
    [outline startContour];
    [outline addPoint:*to];
    base= *to;
    return 0;
}

static int PathLineTo(const FT_Vector *to, void *user)
{
    GlyphOutline* outline=(__bridge GlyphOutline*) user;
    [outline addPoint:*to];
    base=*to;
    return 0;
}

static int PathConicTo(const FT_Vector *control, const FT_Vector *to, void *user)
{
    GlyphOutline* outline=(__bridge GlyphOutline*) user;
    int n=5;
    const FT_Vector* pnts[]={&base, control, to};
    for(int i=1; i<n; i++){
        float t=(float)i/(float)n;
        FT_Vector pt;
        pt.x=(1-t)*(1-t)*(float)pnts[0]->x+2*(1-t)*t*(float)pnts[1]->x+t*t*(float)pnts[2]->x;
        pt.y=(1-t)*(1-t)*(float)pnts[0]->y+2*(1-t)*t*(float)pnts[1]->y+t*t*(float)pnts[2]->y;
        [outline addPoint:pt];
    }
    [outline addPoint:*to];
    base=*to;
    return 0;
}

static int PathCubicTo(const FT_Vector *control1, const FT_Vector *control2,const FT_Vector *to, void *user)
{
    GlyphOutline* outline=(__bridge GlyphOutline*) user;
    const FT_Vector* pnts[]={&base, control1, control2, to};
    int n=5;
    for(int i=1; i<n; i++){
        float t=(float)i/(float)n;
        FT_Vector pt;
        pt.x=(1-t)*(1-t)*(1-t)*(float)pnts[0]->x+3*(1-t)*(1-t)*t*(float)pnts[1]->x+3*(1-t)*t*t*(float)pnts[2]->x+t*t*t*(float)pnts[3]->x;
        pt.y=(1-t)*(1-t)*(1-t)*(float)pnts[0]->y+3*(1-t)*(1-t)*t*(float)pnts[1]->y+3*(1-t)*t*t*(float)pnts[2]->y+t*t*t*(float)pnts[3]->y;
        [outline addPoint:pt];
    }
    [outline addPoint:*to];
    base=*to;
    return 0;
}

FT_Vector base;
NSMutableArray* points;
float scale;
FT_Face gFace;
NSMutableArray* contours;
float width, height;

- (id) initWithFace:(FT_Face)face{
    self=[super init];
    if(self){
        
        gFace=face;
        
        scale=face->size->metrics.y_ppem;
        points=[NSMutableArray array];
        width=(face->glyph->metrics.width>>6)/scale*2.0f;
        height=(face->glyph->metrics.height>>6)/scale*2.0f;

        FT_Outline_Funcs outline_funcs = {
            PathMoveTo, PathLineTo,
            PathConicTo, PathCubicTo, 0, 0
        };
        contours=[NSMutableArray array];
        if (face->glyph->outline.n_contours==0) {
            float fpnt[]={
                -1.0f, -1.0f,
                1.0f, -1.0f,
                1.0f, 1.0f,
                -1.0f, 1.0f,
            };
            for (int i=0; i<4; i++) {
                NSNumber* x=[[NSNumber alloc] initWithFloat:fpnt[2*i]];
                NSNumber* y=[[NSNumber alloc] initWithFloat:fpnt[2*i+1]];
                NSArray* a=[NSArray arrayWithObjects:x, y, nil];
                [points addObject:a];
                [contours addObject:[NSNumber numberWithUnsignedLong:3]];
            }
        }
        else
            FT_Outline_Decompose(&face->glyph->outline, &outline_funcs, (__bridge void*)self);
        if ([points count]>0) {
            [contours addObject:[[NSNumber alloc] initWithUnsignedLong: [points count]-1]];
        }
        
        self.points=[[NSArray alloc] initWithArray:points];
        
        
        self.contours=[[NSArray alloc] initWithArray:contours];
        
        points=nil;
    }
    return self;
}

- (void) startContour{
    if ([points count]>0) {
        [contours addObject:[[NSNumber alloc] initWithUnsignedLong: [points count]-1]];
    }
}

- (void) addPoint:(FT_Vector) xy{
    FT_Face face=gFace;
    NSNumber* x=[[NSNumber alloc] initWithFloat:(float)(xy.x-face->glyph->metrics.horiBearingX)/64.0f/scale*2.0f-width/2.0f];
    NSNumber* y=[[NSNumber alloc] initWithFloat:(float)(xy.y-(face->glyph->metrics.horiBearingY-face->glyph->metrics.height))/64.0f/scale*2.0f-height/2.0f];
    NSArray* axy=[[NSArray alloc] initWithObjects:x, y, nil];
    [points addObject:axy];
    //base=xy;
}

- (void) loadVertex{
    if(self.points){
        
        GLuint vbo;
        glGenBuffers(1, &vbo);
        glBindBuffer(GL_ARRAY_BUFFER, vbo);
        glBufferData(GL_ARRAY_BUFFER, sizeof(float)*3*(self.points.count)*2, NULL, GL_STATIC_DRAW);
        GLfloat* buffer=glMapBuffer(GL_ARRAY_BUFFER, GL_WRITE_ONLY);
        unsigned long floorOffset=(self.points.count*3);
        float depth=0.2;
        float rect[4]={0, 0, 0, 0};
        for (int i=0; i<self.points.count; i++) {
            GLfloat* pCeil=buffer+3*i;
            GLfloat* pFloor=&pCeil[floorOffset];
            NSArray* a=[self.points objectAtIndex:i];
            NSNumber* x=[a objectAtIndex:0];
            NSNumber* y=[a objectAtIndex:1];
            if (rect[0]>[x floatValue]) {
                rect[0]=[x floatValue];
            }
            if (rect[1]<[x floatValue]) {
                rect[1]=[x floatValue];
            }
            if (rect[2]>[y floatValue]) {
                rect[2]=[y floatValue];
            }
            if (rect[3]<[y floatValue]) {
                rect[3]=[y floatValue];
            }
            pCeil[0]=[x floatValue];
            pCeil[1]=[y floatValue];
            pCeil[2]=depth/2;
            pFloor[0]=[x floatValue];
            pFloor[1]=[y floatValue];
            pFloor[2]=-depth/2;
        }
        glUnmapBuffer(GL_ARRAY_BUFFER);
        GLuint vao[2];
        NSNumber* nVao[2];
        glGenVertexArrays(2, vao);
        for (int i=0; i<2; i++) {
            glBindVertexArray(vao[i]);
            glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 0, (void*)(i*floorOffset*sizeof(float)));
            glEnableVertexAttribArray(0);
            nVao[i]=[[NSNumber alloc] initWithUnsignedInt:vao[i]];
        }
        self.vertexObject=vbo;
        self.vertexArray=[[NSArray alloc] initWithObjects:nVao[0], nVao[1], nil];
        
        
        GLuint rectVbo;
        glGenBuffers(1, &rectVbo);
        float rectPnt[]={
            rect[0], rect[2], depth/2,
            rect[1], rect[2], depth/2,
            rect[1], rect[3], depth/2,
            rect[0], rect[3], depth/2,
            rect[0], rect[2], -depth/2,
            rect[0], rect[3], -depth/2,
            rect[1], rect[3], -depth/2,
            rect[1], rect[2], -depth/2,
        };
        GLuint rectVao[2];
        NSNumber* nRectVao[2];
        glGenVertexArrays(2, rectVao);
        glBindBuffer(GL_ARRAY_BUFFER, rectVbo);
        glBufferData(GL_ARRAY_BUFFER, sizeof(rectPnt), rectPnt, GL_STATIC_DRAW);
        for(unsigned int i=0; i<2; i++){
            glBindVertexArray(rectVao[i]);
            glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 0, (void*)(4*3*i*sizeof(float)));
            glEnableVertexAttribArray(0);
            nRectVao[i]=[[NSNumber alloc] initWithUnsignedInt:rectVao[i]];
        }
        self.rectArray=[[NSArray alloc] initWithObjects:nRectVao[0], nRectVao[1], nil];
        
        GLuint wallVertexArray;
        glGenVertexArrays(1, &wallVertexArray);
        glBindVertexArray(wallVertexArray);
        glBindBuffer(GL_ARRAY_BUFFER, vbo);
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 0, (void*)0);
        glEnableVertexAttribArray(0);
        GLuint wallIndex;
        glGenBuffers(1, &wallIndex);
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, wallIndex);
        glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(GLuint)*self.points.count*6, NULL, GL_STATIC_DRAW);
        GLuint* elementBuffer=glMapBuffer(GL_ELEMENT_ARRAY_BUFFER, GL_WRITE_ONLY);
        
        int si=0;
        int loopStart=0;
        for (int i=0; i<self.contours.count; i++) {
            NSInteger ei=[[self.contours objectAtIndex:i] integerValue];
            long numPntPerContour=ei-si+1;
            for(int j=0; j<numPntPerContour; j++){
                GLuint* eP=elementBuffer+6*(si+j);
                int nextJ=(j+1)%numPntPerContour;
                eP[0]=j+si;
                eP[1]=nextJ+si;
                eP[2]=(GLuint)(j+si+self.points.count);
                eP[3]=eP[2];
                eP[4]=eP[1];
                eP[5]=(GLuint)(nextJ+si+self.points.count);
                loopStart+=6;
            }
            si+=numPntPerContour;
        }
        glUnmapBuffer(GL_ELEMENT_ARRAY_BUFFER);
        self.wallArray=wallVertexArray;
    }
}

@end
