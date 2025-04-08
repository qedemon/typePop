//
//  TypePopController.m
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 9..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "TypePopController.h"
#import "MyOpenGLView.h"
#import "TypePopScene.h"

@implementation TypePopController
- (void) startDisplay{
    [self.targetView prepareOpenGLAndStartDisplayLink];
    pastTime=0;
}

- (MyOpenGLView*) targetView{
    return _targetView;
}

- (void) setTargetView:(MyOpenGLView *)targetView{
    _targetView=targetView;
    [_targetView setMainController:self];
}

- (void) loadSceneWithFrame : (NSRect)frame{
    self.currentScene=[[TypePopScene alloc] initWithFrame:frame];
    [self.currentScene loadContents];
}

- (void) setOutputTime:(double)outputTime{
    self.currentScene.outputTime=outputTime;
    double timeDelta=outputTime-pastTime;
    self.currentScene.outputTimeDelta=timeDelta;
    pastTime=outputTime;
}

- (void) drawScene{
    [self.currentScene drawScene];
}

- (void) keyDown:(NSEvent *)theEvent{
    if (!theEvent.isARepeat) {
        [self.currentScene keyDown:theEvent.characters];
    }
}

- (void) keyUp:(NSEvent *)theEvent{
    [self.currentScene keyUp:theEvent.characters];
}

- (void) mouseDown:(NSEvent *)theEvent{
    [self.currentScene mouseDown:theEvent.locationInWindow];
}

- (void) mouseUp:(NSEvent *)theEvent{
    [self.currentScene mouseUp:theEvent.locationInWindow];
}

- (void) mouseDragged:(NSEvent *)theEvent{
    [self.currentScene mouseDragged:theEvent.locationInWindow];
}
@end
