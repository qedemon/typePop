//
//  MyContoller.m
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 8..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "TestMyController.h"
#import "Scene.h"
#import "MyOpenGLView.h"

@implementation TestMyController

- (void) startDisplay{
    [self.targetView prepareOpenGLAndStartDisplayLink];
}

- (MyOpenGLView*) targetView{
    return _targetView;
}

- (void) setTargetView:(MyOpenGLView *)targetView{
    _targetView=targetView;
    [_targetView setMainController:self];
}

- (void) loadSceneWithFrame : (NSRect)frame{
    self.currentScene=[[TypeScene alloc] initWithFrame:frame];
    [self.currentScene loadContents];
}

- (void) setOutputTime:(double)outputTime{
    self.currentScene.outputTime=outputTime;
}

- (void) drawScene{
    [self.currentScene drawScene];
}

- (void) keyDown:(NSEvent *)theEvent{
    [self.currentScene keyDown:theEvent.characters];
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
