//
//  MyOpenGLView.m
//  typePop
//
//  Created by KimTaeseok on 2015. 11. 29..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "MyOpenGLView.h"

@implementation MyOpenGLView

static CVReturn DisplayLinkCallback( CVDisplayLinkRef displayLink, const CVTimeStamp *inNow, const CVTimeStamp *inOutputTime, CVOptionFlags flagsIn, CVOptionFlags *flagsOut, void *displayLinkContext ){
    MyOpenGLView* view=(__bridge MyOpenGLView*)displayLinkContext;
    double outputTime=(double)inOutputTime->videoTime/(double)inOutputTime->videoTimeScale;
    [view setOutputTime:outputTime];
    [view drawOpenGL];
    return kCVReturnSuccess;
}

- (id) initWithFrame:(NSRect)frameRect{
    self=[super initWithFrame:frameRect];
    if(self){
        _startTime=-1;
        isDiplay=NO;
    }
    return self;
}

- (void)prepareOpenGLAndStartDisplayLink{

    NSOpenGLPixelFormatAttribute attrib[]={
        NSOpenGLPFAAccelerated,
        NSOpenGLPFADoubleBuffer,
        NSOpenGLPFADepthSize, 32,
        NSOpenGLPFAStencilSize, 8,
        NSOpenGLPFAOpenGLProfile, NSOpenGLProfileVersion4_1Core,
        0
    };
    pixelFormat=[[NSOpenGLPixelFormat alloc] initWithAttributes:attrib];
    if(pixelFormat){
        glContext=[[NSOpenGLContext alloc] initWithFormat:pixelFormat shareContext:nil];
        if(glContext){
            @autoreleasepool {
                int swapInt=1;
                [glContext setValues:&swapInt forParameter:NSOpenGLCPSwapInterval];
                [glContext makeCurrentContext];
                chdir([[[NSBundle mainBundle] resourcePath] UTF8String]);
                [[self mainController] loadSceneWithFrame:self.frame];
                CVDisplayLinkCreateWithActiveCGDisplays(&displayLink);
                CVDisplayLinkSetCurrentCGDisplayFromOpenGLContext(displayLink, [glContext CGLContextObj], [pixelFormat CGLPixelFormatObj]);
                CVDisplayLinkSetOutputCallback(displayLink, DisplayLinkCallback, (__bridge void*) self);
                CVDisplayLinkStart(displayLink);
                isDiplay=YES;
            }
        }
    }
}

- (BOOL)acceptsFirstResponder{
    return YES;
}

- (void)drawRect:(NSRect)dirtyRect {
    [super drawRect:dirtyRect];
    if (!isDiplay) {
        [self drawOpenGL];
    }
}

- (void) setOutputTime:(double)outputTime{
    if (_startTime<0) {
        _startTime=outputTime;
    }
    _outputTime=outputTime;
    [self.mainController setOutputTime: outputTime-_startTime];
}

- (void) drawOpenGL{
    @autoreleasepool {
        [glContext lock];
        [glContext makeCurrentContext];
        [self.mainController drawScene];
        [glContext flushBuffer];
        [glContext unlock];
    }
}


- (void) lockFocus{
    [super lockFocus];
    if(glContext.view!=self){
        glContext.view=self;
    }
}

// 최신 macOS 에서는 윈도우 contentView 가 자동으로 layer-backed 가 되어
// lockFocus 가 호출되지 않는다. 그 경우 위의 lockFocus 에서 컨텍스트를 뷰에
// 연결하지 못해 화면이 검게 나온다. layer-backed 여부와 무관하게 호출되는
// viewDidMoveToWindow 에서 컨텍스트를 뷰에 연결한다.
- (void) viewDidMoveToWindow{
    [super viewDidMoveToWindow];
    if(self.window!=nil && glContext!=nil && glContext.view!=self){
        [glContext setView:self];
    }
}

- (void) keyDown:(NSEvent *)theEvent{
    if([theEvent keyCode]==53){
        [self.window close];
        return;
    }
    if ([theEvent.characters length]>0) {
        //[glContext lock];
        //[glContext makeCurrentContext];
        [self.mainController keyDown:theEvent];
        //sdkfj[glContext unlock];
    }
}

- (void) keyUp:(NSEvent *)theEvent{
    if ([theEvent.characters length]>0) {
        [self.mainController keyUp:theEvent];
    }
}

- (void) mouseDown:(NSEvent *)theEvent{
    [self.mainController mouseDown:theEvent];
}

- (void) mouseUp:(NSEvent *)theEvent{
    [self.mainController mouseUp:theEvent];
}

- (void) mouseDragged:(NSEvent *)theEvent{
    [self.mainController mouseDragged:theEvent];
}
@end
