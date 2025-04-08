//
//  AppDelegate.m
//  typePop
//
//  Created by KimTaeseok on 2015. 12. 8..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "AppDelegate.h"

@implementation AppDelegate : NSObject
- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    NSRect mainDisplayRect, viewRect;
    mainDisplayRect=[[NSScreen mainScreen] frame];
    fullScreenWindow=[[MyWindow alloc] initWithContentRect:mainDisplayRect styleMask:NSBorderlessWindowMask backing:NSBackingStoreBuffered defer:YES];
    
    [fullScreenWindow setLevel:NSMainMenuWindowLevel+1];
    [fullScreenWindow setOpaque:YES];
    [fullScreenWindow setHidesOnDeactivate:YES];
    
    viewRect=NSMakeRect(0.0, 0.0, mainDisplayRect.size.width, mainDisplayRect.size.height);
    targetView=[[MyOpenGLView alloc]initWithFrame:viewRect];
    controller=[[TypePopController alloc] init];
    [controller setTargetView:(MyOpenGLView*)targetView];
    [controller startDisplay];
    [fullScreenWindow setContentView:targetView];
    
    [fullScreenWindow makeKeyAndOrderFront:self];
    [fullScreenWindow makeMainWindow];
    [fullScreenWindow makeFirstResponder:targetView];
}

- (void)applicationWillTerminate:(NSNotification *)aNotification {
    // Insert code here to tear down your application
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender{
    return YES;
}
@end
