//
//  PushKey.h
//  typePop
//
//  Created by KimTaeseok on 2016. 1. 6..
//  Copyright © 2016년 KimTaeseok. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface PushKey : NSObject
@property float time;
@property NSString* key;
-(id)initWithKey:(NSString*)key;
@end
