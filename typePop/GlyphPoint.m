//
//  GlyphPoint.m
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 10..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "GlyphPoint.h"

@implementation GlyphPoint

- (id) init{
    self=[super init];
    if(self){
        self.life=1.0f;
    }
    return self;
}

- (float*) pos{
    return _pos;
}
- (void) setPos:(float *)pos{
    for(int i=0; i<3; i++){
        _pos[i]=pos[i];
    }
}

-(float*) posV{
    return _posV;
}

-(void) setPosV:(float *)posV{
    for(int i=0; i<3; i++){
        _posV[i]=posV[i];
    }
}

- (float*) axis{
    return _axis;
}
- (void) setAxis:(float *)axis{
    for(int i=0; i<3; i++){
        _axis[i]=axis[i];
    }
}

-(void) update:(float)timeDelta{
    _posV[1]-=2.0f*timeDelta;
    for (int i=0; i<3; i++) {
        _pos[i]+=_posV[i]*timeDelta;
    }
    _rotation+=_rotV*timeDelta;
}
@end
