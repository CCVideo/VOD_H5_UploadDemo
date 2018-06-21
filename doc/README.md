## 一、集成方式
### 1、前端页面集成

参照demo中提供的示例，引用相关的css和js；其中cch5upload.js是我们实现的一个简单的基于jquery的H5文件分块上传插件，只供集成到CC点播业务使用，封装了上传的主要功能，index.js是示例对cch5upload.js的配置使用，用户可根据具体情况将index.js中的代码复制到用户的代码中使用和修改；配置后上传插件会对文件输入组件进行onchange事件监听；上传文件时会生成页面记录显示，可参照index.html代码；记录是按页面中的模板生成的，用户可根据需要增减相关列，会将记录填充到filesContainer下，filesContainer可查看index.js中的配置说明。记录的html代码中指定的class名称和id尽量不要做修改，因为上传插件中有根据classs和id来查找记录的情况，如需修改样式可以新增class；需要配置createuploadinfo回调方法用于生成视频信息，文件上传到cc视频服务器的接口信息由创建视频信息接口返回，对上传文件接口的调用封装在cch5upload.js中，集成时用户不需要修改。


### 2、服务端代码集成
上传文件需要用户服务端提供一个接口，此接口再调用CC视频spark系统的创建视频信息接口生成视频信息。出于安全考虑，生成视频信息的接口只能由用户后端代码发起对CC视频spark系统接口的调用。在demo中用户提供的创建视频信息接口路径为/video/createuploadinfo，通过java实现，用户可参考demo进行后端代码集成和修改,也可根据逻辑使用其它后端代码实现接口。运行demo请先修改Config.java中**USER_ID**和**USER_KEY**的配置。


### 3、cch5upload.js上传插件使用配置说明：

#### 配置基本属性：

* timeout : 可选配置，设置上传请求超时时间默认为60000(一分钟)
* maxChunkSize : 可选配置，文件上传时分块大小，默认为1024×1024(1M)，最大不超过4M
* limitConcurrentUploads : 可选配置，并发上传文件数,默认为3个并发
* createInfoRetries: 可选配置，调用用户创建视频信息接口重试次数,默认为5次
* maxRetries :  可选配置，文件上传失败重试次数,默认10次
* retryTimeout : 可选配置，重试延迟时间,默认为500（毫秒）
* autoUpload : 可选配置，是否添加文件后自动上传,默认为true
* fileInput : 必选配置，文件输入组件input，必需要有的配置,默认为null
* filesContainer : 可选配置，上传文件记录显示的容器,默认为$('.files')

#### 配置回调方法：
* createuploadinfo： 必选配置,上传插件调用此方法创建视频信息，此方法需要请求用户后台接口，再在后台接口请求CC视频spark接口；

* errorMsgHandler： 可选配置，显示错误提示方法回调，默认为alert；

* getCategoryName： 可选配置，获取分类名方法，用于记录显示分类，当有分类且需要记录中显示分类时配置些方法，返回分类名称；

* uploadFail： 可选配置，文件上传失败回调，若设置重试次数大于0, 在重试后仍然失败时回调，不需要返回值；

* uploadSuccess：可选配置，文件上传成功回调，不需要返回值；

## 二、js依赖版本

* 请使用jquery1.6以上的版本；
* tmp 请使用2.5.4以上的版本；

## 三、浏览器支持情况
* Google Chrome
* Apple Safari 4.0+
* Mozilla Firefox 4.0+
* Opera 12.0+
* IE 10+





