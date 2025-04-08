//
//  Glyph.m
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 2..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "Glyph.h"

#define KEYBOARD_WIDTH 282.0
#define KEY_WIDTH 15.5

@implementation Glyph
static float getGLLocation(float keyLeft, float keyBoardWidth){
    return keyLeft/keyBoardWidth*2.0f-1.0f;
}

-(id) initWithFace:(FT_Face)face{
    self=[super init];
    if (self) {
        glGetError();
        /*GLuint tex;
        glGenTextures(1, &tex);
        glBindTexture(GL_TEXTURE_2D, tex);
        glPixelStorei(GL_UNPACK_ALIGNMENT, 1);
        
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RED, face->glyph->bitmap.width, face->glyph->bitmap.rows, 0, GL_RED, GL_UNSIGNED_BYTE, face->glyph->bitmap.buffer);
        
        GLint swizzle[]={
            GL_RED, GL_RED, GL_RED, GL_RED
        };
        glTexParameteriv(GL_TEXTURE_2D, GL_TEXTURE_SWIZZLE_RGBA, swizzle);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        if (glGetError()!=GL_NO_ERROR) {
            NSLog(@"Texture Error");
        }*/
        //[self setTex:tex];
        NSRect rect;
        self.scale=face->size->metrics.y_ppem;
        rect.size.width=(face->glyph->metrics.width>>6)/self.scale*2.0f;
        rect.size.height=(face->glyph->metrics.height>>6)/self.scale*2.0f;
        rect.origin.x=0;
        rect.origin.y=0;
        [self setRect:rect];
        self.outline=[[GlyphOutline alloc] initWithFace:face];
        
        self.keyPos=0;
    }
    return self;
}

+(float) keyWidth{
    return KEY_WIDTH;
}

+(float) keyBoardWidth{
    return KEYBOARD_WIDTH;
}

+(NSMutableDictionary*) loadDefaultGlyphWithEnFace:(FT_Face) enFace AndKoFace:(FT_Face) koFace{
    NSMutableDictionary* texDict=[NSMutableDictionary dictionary];
    NSString* keysArray[5][6];
    NSPoint keyPos[5];
    keyPos[0]={getGLLocation(6.0f, KEYBOARD_WIDTH), getGLLocation(233.5f, KEYBOARD_WIDTH)};
    keysArray[0][0]=@"`1234567890-=";
    keysArray[0][1]=@"~!@#$%^&*()_+";
    keysArray[0][2]=@"`¡™£¢∞§¶•ªº–≠";
    keysArray[0][3]=@"`⁄€‹›ﬁﬂ‡°·‚—±";
    keysArray[0][4]=@"";
    keysArray[0][5]=@"";
    keyPos[1]={getGLLocation(34.5f, KEYBOARD_WIDTH), getGLLocation(261.0f, KEYBOARD_WIDTH)};
    keysArray[1][0]=@"qwertyuiop[]\\";
    keysArray[1][1]=@"QWERTYUIOP{}|";
    keysArray[1][2]=@"œ∑´®†¥¨ˆøπ“‘«";
    keysArray[1][3]=@"Œ„´‰ˇÁ¨ˆØ∏”’»";
    keysArray[1][4]=@"ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ[]\\";
    keysArray[1][5]=@"ㅃㅉㄸㄲㅆㅛㅕㅑㅒㅖ{}\\";
    keyPos[2]={getGLLocation(39.0f, KEYBOARD_WIDTH), getGLLocation(229.5f, KEYBOARD_WIDTH)};
    keysArray[2][0]=@"asdfghjkl;'";
    keysArray[2][1]=@"ASDFGHJKL:\"";
    keysArray[2][2]=@"åß∂ƒ©˙∆˚¬…æ";
    keysArray[2][3]=@"ÅÍÎÏ˝ÓÔÒÚÆ";
    keysArray[2][4]=@"ㅁㄴㅇㄹㅎㅗㅓㅏㅣ;'";
    keysArray[2][5]=@"";
    keyPos[3]={getGLLocation(49.0f, KEYBOARD_WIDTH), getGLLocation(219.5f, KEYBOARD_WIDTH)};
    keysArray[3][0]=@"zxcvbnm,./";
    keysArray[3][1]=@"ZXCVBNM<>?";
    keysArray[3][2]=@"Ω≈ç√∫˜µ≤≥÷";
    keysArray[3][3]=@"¸˛Ç◊ı˜Â¯˘¿";
    keysArray[3][4]=@"ㅋㅌㅊㅍㅠㅜㅡ,./";
    keysArray[3][5]=@"";
    keyPos[4]={getGLLocation(129, KEYBOARD_WIDTH), getGLLocation(129, KEYBOARD_WIDTH)};
    keysArray[4][0]=@" ";
    for (int j=0; j<5; j++) {
        for(int k=0; k<6; k++){
            if (j==4 && k>0) {
                break;
            }
            NSString* keys=keysArray[j][k];
            NSPoint pos=keyPos[j];
            for (int i=0; i<keys.length; i++) {
                FT_Face face=(k>=4)?koFace:enFace;
                NSRange range={(NSUInteger)i, (NSUInteger)1};
                NSString* key=[keys substringWithRange:range];
                if(FT_Load_Char(face, [key characterAtIndex:0], FT_LOAD_DEFAULT|FT_LOAD_NO_BITMAP)){
                    NSLog(@"Load Char Error at %d, %d, %d", j, k, i);
                }
            
                Glyph* glyph=[[Glyph alloc] initWithFace:face];
                [[glyph outline] loadVertex];
                float t=(keys.length<=1)?0:(float)i/(float)(keys.length-1);
                glyph.keyPos=pos.x*(1-t)+pos.y*t;
                [texDict setObject:glyph forKey:key];
            }
        }
    }
    return texDict;
}
@end
