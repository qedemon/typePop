//
//  MyOpenGLView.h
//  typePop
//
//  Created by KimTaeseok on 2015. 11. 29..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import "TypeScene.h"
#import "MyController.h"

@interface MyOpenGLView : NSView{
    NSOpenGLPixelFormat* pixelFormat;
    NSOpenGLContext* glContext;
    CVDisplayLinkRef displayLink;
    BOOL isDiplay;
    double _startTime;
    double _outputTime;
    //TypeScene* currentScene;
}
@property NSResponder<MyController>* mainController;
- (void)prepareOpenGLAndStartDisplayLink;
@end
