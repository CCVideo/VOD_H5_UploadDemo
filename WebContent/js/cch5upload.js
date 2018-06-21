(function($) {
	if (typeof CCH5Uploader === 'function') {
		return;
	}
	var CCH5UploaderClass = function(options) {
		var defaultOptions = {
				// 文件输入节点，必须要配置
				fileInput : undefined,
				// 添加后自动上传
				autoUpload : true,
				// 设置请求超时时间，默认为一分钟 超时会重试
				timeout : 60000, 
				// 获取选择的文件后是否要替换输入框，这样两次换择相同的文件时会上传两次
				replaceFileInput:true,
				// 并发上传数,默认3个
				limitConcurrentUploads : 3,
				// ajax请求设置
				multipart : true,
				// 分块大小，默认为1M，不能超过4M,超过4M时以4M进行分块
				maxChunkSize : 1024 * 1024,
				//调用用户创建视频信息接口重试次数,默认为5次
				createInfoRetries:5,
				// 文件上传失败重试次数
				maxRetries : 10, 
				//重试延迟时间（毫秒）
				retryTimeout : 500,
				// 进度触发间隔时间（毫秒）
				progressInterval : 100,
				// 上传速度计算间隔时间(毫秒)
				bitrateInterval : 500,
				// 模板id
				uploadTemplateId: 'template-upload',
				// 上传记录容器
				filesContainer: $('.files'),
				// 添加记录按时间倒序显示
				prependFiles: false,
				// ajax 上传请求返回数据类型
				dataType: 'json',
				// ajax上传请求配置，发送数据不转换成字符串
				processData: false,
				contentType: false,
				cache : false,
				// 获取分类名
				getCategoryName: function(){return null;},
				// 错误消息显示默认为alert
				errorMsgHandler:function(msg){
					if(typeof window.errorMsgHandler === 'function'){
						window.errorMsgHandler(msg);
					}else{
						alert(msg);
					}
				}
		}
		//获取参数
		this.options = $.extend(defaultOptions, options);
		//文件上传状态字典
		this.uploadStatusDict = {added:"added",ready:"ready", uploading:"uploading", paused:"paused", canceled:"canceled", success:"success", failure:"failure"};
		this.initSpecialOptions();
		this.slots = [];
		this.sending = this.active = 0;
		this.initEventHandlers();

		if (!this.isSupportBrowse()) {
			this.options.errorMsgHandler("您的浏览器不支持当前的文件上传方式，请使用其它浏览器");
		}
	};

	CCH5UploaderClass.prototype = {
			constructor : CCH5UploaderClass,

			//是否能在当前浏览器上使用
			isSupportBrowse: function(){
				if(!(window.ProgressEvent && window.FileReader)){
					return false;
				}
				if(!window.FormData){
					return false;
				}
				// 是否支持分片
				var blobSlice = window.Blob && (Blob.prototype.slice || Blob.prototype.webkitSlice || Blob.prototype.mozSlice);
				if(!blobSlice){
					return false;
				}
				return true;
			},

			//初始化配置
			initSpecialOptions: function () {
				var options = this.options;
				if (options.fileInput !== undefined && !(options.fileInput instanceof $)) {
					options.fileInput = $(options.fileInput);
				}
				this.initFilesContainer();
				this.initTemplates();
			},
            
			//进度数据初始化
			initProgressObject: function (obj) {
				var progress = {
						loaded: 0,
						total: 0,
						bitrate: 0
				};
				if (obj.progress) {
					$.extend(obj.progress, progress);
				} else {
					obj.progress = progress;
				}
			},
            
			//初始化事件
			initEventHandlers: function () {
				var that = this;
				//添加文件事件
				$(this.options.fileInput).change(function(e) {
					var data = {
							fileInput: $(e.target),
							form: $(e.target.form)
					};
					that.getFileInputFiles(data.fileInput).always(function (files) {
						data.files = files;
						if (that.options.replaceFileInput) {
							//复制替换文件输入组件，两次选择相同文件时可以上传两次
							that.replaceFileInput(data.fileInput);
						}
						that.onAdd(data);
					});
				});
			},
            
			//设置进度监听
			initProgressListener: function (options) {
				var that = this,
				xhr = options.xhr ? options.xhr() : $.ajaxSettings.xhr();
				if (xhr.upload) {
					$(xhr.upload).bind('progress', function (e) {
						var oe = e.originalEvent;
						e.lengthComputable = oe.lengthComputable;
						e.loaded = oe.loaded;
						e.total = oe.total;
						that.onProgress(e, options);
					});
					options.xhr = function () {
						return xhr;
					};
				}
			},

			//上传请求数据设置
			initXHRData: function (dataOptions) {
				var formData = new FormData(),
				file = dataOptions.files[0];
				dataOptions.headers = $.extend({}, dataOptions.headers);
				if (dataOptions.contentRange) {
					dataOptions.headers['Content-Range'] = dataOptions.contentRange;
				}
				dataOptions.headers['Content-Disposition'] = 'attachment; filename="' + encodeURI(file.name) + '"';
				if (dataOptions.blob) {
					//文件数据
					formData.append('file', dataOptions.blob, file.name);
				}
				dataOptions.data = formData;
				dataOptions.blob = null;
			},

			// 提交上传一个文件
			submitUpload : function (data) {
				data.failMsg = null;
				this.active += 1;
				if (!data.submit) {
					this.addConvenienceMethods(data);
				}
				var that = this,
				jqXHR,
				slot,
				pipe;
				data.uploadStatus = this.uploadStatusDict.ready;

				var send = function () {
					//状态被更改，如暂停或取消。不再发送
					if(data.uploadStatus !==  that.uploadStatusDict.ready){
						that.uploadNext();
						return;
					}
					//如果没有创建视频信息，先创建视频信息
					if(!data.video){
						var video = null;
						//创建视频信息失败重试
						for(var i=0; i < that.options.createInfoRetries; i++){
							var file = data.files[0];
							video = that.callback('createuploadinfo', file.name, file.size);
							if (typeof video.errMsg === 'string' && video.errorType === 'network'){
								continue;
							}
							break;
						}
						// 判断video是否合法
						if (video.errMsg != null || video.ccvid === undefined
								|| video.uid === undefined) {
							data.failMsg = video.errMsg + ",点击重试,再次上传，文件名:" + data.files[0].name;
							that.onFail(data, false);
							return;
						} else {
							data.video = video;
							//设置上传接口地址
							data.url = video.uri + "?ccvid=" + video.ccvid;
						}
					}
					
					//开始上传
					that.startUpload(data);
					return;
				} 

				if (this.options.limitConcurrentUploads && this.options.limitConcurrentUploads <= this.sending) {
					slot = $.Deferred();
					this.slots.push(slot);
					//控制并发上传
					pipe = slot.pipe(function(){
						send();
					});
					data.jqXHR =this.enhancePromise(pipe);
					return;
				}
				
				send();
			},
		    
			// 开始上传,只能在submitUpload方法内调用
			startUpload : function(data) {
				var that = this;
				var promise = this.queryPosition(data);
				
				promise.fail(function(errMsg){
					data.failMsg = errMsg;
					//重试
					that.onFail(data, true);
				});
				
				promise.done(function(responseData){
					//文件已全部接收，上传成功
					if(responseData.result == 1){
						data.uploadedBytes = data.files[0].size;
						that.onDone(that.uploadStatusDict.success, data);
						return;
					}
					//成功获取“断点位置”
					if(responseData.result == 0){
						data.uploadedBytes = parseInt(responseData.received);
						
						//正式开始上传文件
						that.doUpload(data);
						return;
					}
					//-1  上传失败，可以放弃“本次”上传，不再重试了
					if(responseData.result == -1){
						data.failMsg = "上传失败,code:-1";
						that.onFail(data, false);
						return;
					}
					//-2  服务器内部错误，可以续传重试
					if(responseData.result == -2){
						data.failMsg = "上传失败,code:-2";
						that.onFail(data, true);
						return;
					}
					//-3  请求参数错误
					if(responseData.result == -3){
						data.failMsg = "上传失败,code:-3";
						that.onFail(data, false);
						return;
					}
				});
			},
			
			//正式开始上传文件
			doUpload: function(data){
				that = this;
				var dataOptions = that.getAJAXSettings(data);

				//重新设置data,使暂停或取消时修改状态能够在chunkedUpload方法内生效
				$(data.context).data('data', dataOptions);

				that.beforeSend(dataOptions);
				
				that.sending += 1;
				// 设置上传速度定时器
				dataOptions._bitrateTimer = new that.BitrateTimer();
				dataOptions.uploadStatus =  that.uploadStatusDict.uploading;
				//上传某个文件
				var jqXHR = (that.chunkedUpload(dataOptions)).done(function (jqXHR, uploadStatus, responseData) {
					//一个文件上传完成后的回调
					that.onDone(uploadStatus, dataOptions);
				}).fail(function (jqXHR, uploadStatus, error, isNeedRetry) {
					//一个文件上传失败后的回调,主动放弃上传不再回调onFail方法
					if(error != 'abort'){
						dataOptions.failMsg = "上传失败，code:" + error;
						that.onFail(dataOptions, isNeedRetry);
					}
				}).always(function (jqXHR, uploadStatus) {
					//一个文件上传成功或失败后的回调
					that.onAlways(jqXHR, uploadStatus, dataOptions);
					that.sending -= 1;
					that.active -= 1;
					that.uploadNext();
				});
				data.jqXHR = jqXHR;
			},
			
			uploadNext:function(){
				that = this;
				if (that.options.limitConcurrentUploads &&
						that.options.limitConcurrentUploads > that.sending) {
					//并发数未超的情况下上传下一个等待上传的文件
					var nextSlot = that.slots.shift();
					while (nextSlot) {
						if (that.getDeferredState(nextSlot) === 'pending') {
							nextSlot.resolve();
							break;
						}
						nextSlot = that.slots.shift();
					}
				}
			},
			//分块文件上传
			chunkedUpload: function (dataOptions) {
				dataOptions.uploadedBytes = dataOptions.uploadedBytes || 0;
				//配置分块大小超过4M时重置成4M
				if(dataOptions.maxChunkSize && dataOptions.maxChunkSize > 4 * 1024 * 1024){
					dataOptions.maxChunkSize = 4 * 1024 * 1024;
				}
				var that = this,
				file = dataOptions.files[0],
				fs = file.size,
				ub = dataOptions.uploadedBytes,
				mcs = dataOptions.maxChunkSize || 1024 * 1024,
				slice = this.blobSlice,
				dfd = $.Deferred(),
				promise = dfd.promise(),
				jqXHR,
				upload;
				if (ub >= fs) {
					file.error = "上传数据错误";
					return this.getXHRPromise(false, dataOptions.context, [null, 'error', file.error]);
				}
				// 分块上传方法:
				upload = function () {
					// 复制当前配置给每一个分块数据
					var dataReqestOpt = $.extend({}, dataOptions),
					currentLoaded = dataReqestOpt.progress.loaded;
					//文件分块
					dataReqestOpt.blob = slice.call(file, ub, ub + mcs, file.type);
					// 记录块大小
					dataReqestOpt.chunkSize = dataReqestOpt.blob.size;
					// 计算本次上传range范围
					dataReqestOpt.contentRange = 'bytes ' + ub + '-' + (ub + dataReqestOpt.chunkSize - 1) + '/' + fs;
					// 设置请求数据信息
					that.initXHRData(dataReqestOpt);
					// 添加上传进度
					that.initProgressListener(dataReqestOpt);
					//$.ajax(dataReqestOpt)上传文件数据
					jqXHR = ($.ajax(dataReqestOpt) || that.getXHRPromise(false, dataReqestOpt.context))
					.done(function (responseData, textStatus, jqXHR) {
						//正常上传完一块数据后的回调
						if(!!responseData.received && responseData.received >= 0){
							ub = parseInt(responseData.received);
							dataOptions.uploadedBytes = dataReqestOpt.uploadedBytes = ub;
						}
						//文件已全部接收，上传成功
						if(responseData.result == 1){
							dfd.resolveWith(dataReqestOpt.context,[jqXHR, that.uploadStatusDict.success, responseData]);
							return;
						}
						//-1  上传失败，可以放弃“本次”上传，不再重试了
						if(responseData.result == -1){
							dataReqestOpt.jqXHR = jqXHR;
							dfd.rejectWith(dataReqestOpt.context,[jqXHR, that.uploadStatusDict.failure, responseData.result, false]);
							return;
						}
						
						//-2  服务器内部错误，可以续传重试
						if(responseData.result == -2){
							dataReqestOpt.jqXHR = jqXHR;
							dfd.rejectWith(dataReqestOpt.context,[jqXHR, that.uploadStatusDict.failure, responseData.result, true]);
							return;
						}
						
						//-3  请求参数错误
						if(responseData.result == -3){
							dataReqestOpt.jqXHR = jqXHR;
							dfd.rejectWith(dataReqestOpt.context,[jqXHR, that.uploadStatusDict.failure, responseData.result, false]);
							return;
						}
						
						//0为成功接收文件块，并返回“断点位置,这种情况继续走下边逻辑进行续传或重试
						if (currentLoaded + dataReqestOpt.chunkSize - dataReqestOpt.progress.loaded > 0) {
							that.onProgress($.Event('progress', {
								lengthComputable: true,
								loaded: ub - dataReqestOpt.uploadedBytes,
								total: ub - dataReqestOpt.uploadedBytes
							}), dataReqestOpt);
						}
						dataReqestOpt.result = ub;
						dataReqestOpt.jqXHR = jqXHR;
						if (ub < fs) {
							// 继续传下一块数据
							if(dataReqestOpt.uploadStatus === that.uploadStatusDict.uploading){
								upload();
							}else{
								//暂停或取消,正常通过abort方法调用不会走到这里
								dfd.rejectWith(dataReqestOpt.context,[jqXHR, dataReqestOpt.uploadStatus, 'abort', false]);
							}
						} else {
							//触发一个文件上传完成的回调
							dfd.resolveWith(dataReqestOpt.context,[jqXHR, that.uploadStatusDict.success , responseData]);
						}
					}).fail(function (jqXHR, textStatus, errorThrown) {
						//上传一块数据失败后的回调
						dataReqestOpt.jqXHR = jqXHR;
						dataReqestOpt.errorThrown = errorThrown;
						dfd.rejectWith(dataReqestOpt.context,[jqXHR, that.uploadStatusDict.failure, errorThrown, true]);
					});
				};
				
				this.enhancePromise(promise);
				promise.abort = function () {
					return jqXHR.abort();
				};
				
				upload();
				return promise;
			},

			
			//准备上传前的数据初始化
			beforeSend: function (dataOptions) {
				this.initProgressObject(dataOptions);
				dataOptions.progress.loaded = dataOptions.loaded = dataOptions.uploadedBytes || 0;
				dataOptions.progress.total = dataOptions.total = this.getTotal(dataOptions.files) || 1;
				dataOptions.progress.bitrate = dataOptions.bitrate = 0;
			},
			
			//获取断点位置,返回一个promise
			queryPosition: function (data) {
				var that = this,
				uploadData = data,
				dfd = $.Deferred(),
				promise = dfd.promise();
				var uri = uploadData.video.metauri;
				$.ajax({
					url : uri,
					type : "get",
					async: false,
					data : {
						"ccvid" : uploadData.video.ccvid,
						"uid" : uploadData.video.uid,
						"filename" : uploadData.video.name,
						"filesize" : uploadData.video.size,
						"servicetype" : uploadData.video.servicetype
					},
					cache : false,
					error : function() {
						dfd.reject("获取文件断点出错");
					},
					success : function(responseData) {
						dfd.resolve(responseData);
					}
				});
				this.enhancePromise(promise);
				return promise;
			},
			
			//每一个文件上传完成的回调
			onDone: function (textStatus, data) {
				if(textStatus ===  this.uploadStatusDict.success){
					//修改状态
					data.uploadStatus = textStatus;
				}
				var total = data.progress.total;
				if (this.uploadStatusDict.success === textStatus && data.progress.loaded < total) {
					this.onProgress($.Event('progress', {
						lengthComputable: true,
						loaded: total,
						total: total
					}), data);
				}
				if(this.uploadStatusDict.success === textStatus){
					this.callback('uploadSuccess', data.context, data.files[0].name, data.video.ccvid);
					//删除data数据
					data.context.removeData("data");
					return;
				}
			},

			//每一个文件上传失败的回调
			onFail: function (data, isNeedRetry) {
				var that = this;
				var retries = data.context.data('retries') || 0,
				retry = function () {
					var promise = that.queryPosition(data);
					
					promise.fail(function(errMsg){
						data.failMsg = errMsg;
						that.onFail(data, true);
					});
					
					promise.done(function(responseData){
						//文件已全部接收，上传成功
						if(responseData.result == 1){
							data.uploadedBytes = data.files[0].size;
							that.onDone(that.uploadStatusDict.success, data);
							return;
						}
						//成功获取“断点位置”
						if(responseData.result == 0){
							data.uploadedBytes = parseInt(responseData.received);
							data.submit();
							return;
						}
						//-1  上传失败，可以放弃“本次”上传，不再重试了
						if(responseData.result == -1){
							data.failMsg = "上传失败，code: -1";
							that.onFail(data ,false);
							return;
						}
						//-2  服务器内部错误，可以续传重试
						if(responseData.result == -2){
							data.failMsg = "上传失败，code: -2";
							that.onFail(data ,true);
							return;
						}
						//-3  请求参数错误
						if(responseData.result == -3){
							data.failMsg = "上传失败，code: -3";
							that.onFail(data, false);
							return;
						}
						//默认重试
						that.onFail(data, true);
					});
				};
				if (isNeedRetry && data.uploadStatus != that.uploadStatusDict.paused
						&& data.uploadStatus != that.uploadStatusDict.canceled
						&& data.uploadedBytes < data.files[0].size
						&& retries < that.options.maxRetries) {
					retries += 1;
					
					data.context.data('retries', retries);
					//延时，最大不超过5分钟
					var delay = retries * that.options.retryTimeout;
					window.setTimeout(retry, delay);
					return;
				} 
				
				data.context.removeData('retries');
				$(data.context).find("#pause").click();
				//修改状态
				data.uploadStatus = that.uploadStatusDict.failure;
				that.callback('uploadFail', data.context, data.files[0].name , data.failMsg);
			},

			//每一个文件上传结束后（无论成功或失败）的回调
			onAlways: function (jqXHR, uploadStatus, data) {
				//onDone和onFail先执行，此方法后执行
				//console.log(uploadStatus);
			},
			
			
			// 文件上传请求设置
			getAJAXSettings: function (data) {
				var dataOptions = $.extend({}, this.options, data);
				dataOptions.type = 'POST';
				return dataOptions;
			},

			// 给每一个上传的文件记录添加一些方法
			addConvenienceMethods: function (data) {
				var that = this;
				data.submit = function (e) {
					//提交上传
					that.submitUpload(this);
				};
				//中断上传
				data.abort = function () {
					if (data.jqXHR && data.jqXHR.abort) {
						return data.jqXHR.abort();
					}
				};
				data.state = function () {
					if (data.jqXHR) {
						return that.getDeferredState(data.jqXHR);
					}
				};
				data.getProgress = function () {
					return data.progress;
				};
			},

			
			// deferred状态兼容处理，jQuery 1.6 不支持 .state(),jQuery 1.8+ 删除了 .isRejected() 和 .isResolved()方法
			getDeferredState: function (deferred) {
				if (deferred.state) {
					return deferred.state();
				}
				if (deferred.isResolved()) {
					return 'resolved';
				}
				if (deferred.isRejected()) {
					return 'rejected';
				}
				return 'pending';
			},

			// 回调方法映射
			enhancePromise: function (promise) {
				promise.success = promise.done;
				promise.error = promise.fail;
				promise.complete = promise.always;
				return promise;
			},

			//创建一个将回调方法重映射后的promise
			getXHRPromise: function (resolveOrReject, context, args) {
				var dfd = $.Deferred(),
				promise = dfd.promise();
				context = context || this.options.context || promise;
				if (resolveOrReject === true) {
					dfd.resolveWith(context, args);
				} else if (resolveOrReject === false) {
					dfd.rejectWith(context, args);
				}
				return this.enhancePromise(promise);
			},

			blobSlice: function () {
				var slice = this.slice || this.webkitSlice || this.mozSlice;
				return slice.apply(this, arguments);
			},

			//上传速度计算
			BitrateTimer: function () {
				this.timestamp = ((Date.now) ? Date.now() : (new Date()).getTime());
				this.loaded = 0;
				this.bitrate = 0;
				this.getBitrate = function (now, loaded, interval) {
					var timeDiff = now - this.timestamp;
					if (!this.bitrate || !interval || timeDiff > interval) {
						this.bitrate = (loaded - this.loaded) * (1000 / timeDiff) * 8;
						this.loaded = loaded;
						this.timestamp = now;
					}
					return this.bitrate;
				};
			},

			//获取文件总大小
			getTotal: function (files) {
				var total = 0;
				$.each(files, function (index, file) {
					total += file.size || 1;
				});
				return total;
			},

			//上传进度回调
			onProgress: function (e, data) {
				if (e.lengthComputable) {
					var now = ((Date.now) ? Date.now() : (new Date()).getTime()),
					loaded;
					if (data.time && data.progressInterval &&
							(now - data.time < data.progressInterval) &&
							e.loaded !== e.total) {
						return;
					}
					data.time = now;
					loaded = Math.floor(
							e.loaded / e.total * (data.chunkSize || data.progress.total)
					) + (data.uploadedBytes || 0);
					data.progress.loaded = data.loaded = loaded;
					data.progress.bitrate = data.bitrate = data._bitrateTimer.getBitrate(
							now,
							loaded,
							data.bitrateInterval
					);
					//上传进度
					this.progressui(e, data);
				}
			},

			//准备添加一条文件数据
			onAdd: function (data) {
				var that = this,
				result = true;
				data.originalFiles = data.files;
				$.each(data.files, function (index, file) {
					var newData = $.extend({}, data);
					//每条数据只关联一个文件
					newData.files = [file];
					that.initProgressObject(newData);
					that.addConvenienceMethods(newData);
					//验证添加的数据是否能上传
					result = that.validateAdd(file.name, file.size);
					if(result){
						//添加文件数据到页面
						that.add(newData);
					}
					return result;
				});
				return result;
			},

			// 添加一条文件数据
			add:function(data){
				var that = this,
				options = that.options;
				//添加成功后初始状态为added
				data.uploadStatus = that.uploadStatusDict.added;
				//在页面显示
				data.context = that.renderUpload(data.files).data('data', data).addClass('processing');
				//添加事件 
				that.initRecordEvent(data.context);
				options.filesContainer[ options.prependFiles ? 'prepend' : 'append'](data.context);

				data.context.each(function (index) {
					$(this).find('.size').text(
						that.formatFileSize(data.files[index].size)
					);
				}).removeClass('processing');

				data.context.find('.preview').each(function (index, elm) {
					$(elm).append(data.files[index].preview);
				});

				data.context.find('.start').prop('disabled', false);

				//如果是自动上传，添加后就开始上传
				if ((options.autoUpload || data.autoUpload) &&
						data.autoUpload !== false) {
					var startBtn = data.context.find(".start");
					
					if(startBtn.length > 0){
						$(startBtn).click();
					}else{
						data.context.find("#pause").attr('disabled', false);
						that.submitUpload(data);
					}
				}
			},
			
			//验证添加的文件数据是否可以上传
		    validateAdd: function (fileName,fileSize) {
		 		// 处理问题信息
		 		var fileType = fileName.split('.').pop().toLowerCase();
		 		var allowVideoTypes = ',wmv,wm,asf,asx,rm,rmvb,ra,ram,mpg,mpeg,mpe,vob,dat,mov,3gp,mp4,mp4v,m4v,mkv,avi,flv,f4v,mts,m2t,';
		 		var allowAudioTypes = ',wav,aif,aiff,au,snd,voc,mp3,ra,mid,rmi,wma,ape,flac,aac,m4a,vqf,';
		 		if (allowVideoTypes.indexOf(',' + fileType + ',') < 0 && allowAudioTypes.indexOf(',' + fileType + ',') < 0) {
		 			var content = "请选择正确的视频或音频文件";
		 			this.options.errorMsgHandler(content);
		 			return false;
		 		} else {
		 			return true;
		 		}
		    },
		    
			//复制替换文件输入节点，使两次选择相同的文件时可以触发onChange事件
			replaceFileInput: function (input) {
				var inputClone = input.clone(true);
				$('<form></form>').append(inputClone)[0].reset();
				input.after(inputClone).detach();
				$.cleanData(input.unbind('remove'));
				this.options.fileInput = this.options.fileInput.map(function (i, el) {
					if (el === input[0]) {
						return inputClone[0];
					}
					return el;
				});
			},

			//根据文件输入元素获取文件，
			getFileInputFiles : function(fileInput) {
				if (!(fileInput instanceof $) || fileInput.length === 1) {
					return this.getSingleFileInputFiles(fileInput);
				}
				return $.when.apply($, $.map(fileInput, this.getSingleFileInputFiles)).pipe(
						function() {
							return Array.prototype.concat.apply([], arguments);
						});
			},

			getSingleFileInputFiles : function(fileInput) {
				fileInput = $(fileInput);
				var entries = fileInput.prop('webkitEntries')
				|| fileInput.prop('entries'), files, value;
				if (entries && entries.length) {
					return this.handleFileTreeEntries(entries);
				}
				files = $.makeArray(fileInput.prop('files'));
				if (!files.length) {
					value = fileInput.prop('value');
					if (!value) {
						return $.Deferred().resolve([]).promise();
					}
					files = [ {
						name : value.replace(/^.*\\/, '')
					} ];
				} else if (files[0].name === undefined && files[0].fileName) {
					// File normalization for Safari 4 and Firefox 3:
					$.each(files, function(index, file) {
						file.name = file.fileName;
						file.size = file.fileSize;
					});
				}
				return $.Deferred().resolve(files).promise();
			},

			handleFileTreeEntries : function(entries, path) {
				var that = this;
				return $.when.apply($, $.map(entries, function(entry) {
					return that.handleFileTreeEntry(entry, path);
				})).pipe(function() {
					return Array.prototype.concat.apply([], arguments);
				});
			},

			handleFileTreeEntry : function(entry, path) {
				var that = this, 
				dfd = $.Deferred(), 
				errorHandler = function(e) {
					if (e && !e.entry) {
						e.entry = entry;
					}
					dfd.resolve([ e ]);
				}, dirReader;
				path = path || '';
				if (entry.isFile) {
					if (entry._file) {
						// Workaround for Chrome bug #149735
						entry._file.relativePath = path;
						dfd.resolve(entry._file);
					} else {
						entry.file(function(file) {
							file.relativePath = path;
							dfd.resolve(file);
						}, errorHandler);
					}
				} else if (entry.isDirectory) {
					dirReader = entry.createReader();
					dirReader.readEntries(function(entries) {
						that.handleFileTreeEntries(entries,
								path + entry.name + '/').done(function(files) {
									dfd.resolve(files);
								}).fail(errorHandler);
					}, errorHandler);
				} else {
					dfd.resolve([]);
				}
				return dfd.promise();
			},

			//------------------以下主要是ui操作相关的一些方法-------------------------

			initFilesContainer: function () {
				var options = this.options;
				if (!(options.filesContainer instanceof $)) {
					options.filesContainer = $(options.filesContainer);
				}
			},

			initTemplates: function () {
				var options = this.options;
				options.templatesContainer = document.createElement(
					options.filesContainer.prop('nodeName')
				);
				if (tmpl) {
					if (options.uploadTemplateId) {
						options.uploadTemplate = tmpl(options.uploadTemplateId);
					}
				}
			},

			renderUpload: function (files) {
				return this.renderTemplate(this.options.uploadTemplate,files);
			},

			renderTemplate: function (func, files) {
				if (!func) {
					return $();
				}
				//增加分类，上传格式的显示
				var categoryName = this.options.getCategoryName();
				for(var i=0; i < files.length; i++){
					var name = files[i].name;
					files[i].extendName = name.substr(name.lastIndexOf(".") + 1).toUpperCase();
					if(categoryName != null){
						files[i].categoryDesc = categoryName;
						var shortCategoryName = categoryName.length > 9 ? categoryName.substr(0, 8) + '...' : categoryName;
						files[i].shortCategoryDesc = shortCategoryName;
					}
				}
				var result = func({
					files: files,
					formatFileSize: this.formatFileSize,
					options: this.options
				});
				if (result instanceof $) {
					return result;
				}
				return $(this.options.templatesContainer).html(result).children();
			},
			
			//更新进度显示
			progressui: function (e, data) {
				var parentDoc = this;
				var progress = Math.floor(data.loaded / data.total * 100);
				if (data.context) {
					data.context.each(function () {
						$(this).find('.progress').attr('aria-valuenow', progress).children().first().css('width', progress + '%');
						$(this).find('.upload_percent').html(progress + '%');
						// rate
						$(this).find('.rate').html(
								parentDoc.cc_renderExtendedProgress(data));
						if(progress == 100){
							if(data.context.find('.progressbar').length > 0){
								//有暂停操作的示例
								data.context.find('.progressbar').html('<div class="tc" style="margin-top:6px;">上传完毕</div>');
								data.context.find('.rate').html('');
								data.context.find('.operate').html('');
							}else{
								//无暂停操作的示例
								data.context.find('.start').parent().append('<span class="">上传成功</span>');
								data.context.find('.start, .cancel, .progress').remove();
							}
						}
					});
				}
			},

			formatFileSize: function (bytes) {
				if (typeof bytes !== 'number') {
					return '';
				}
				if (bytes >= 1073741824) {
					return (bytes / 1073741824).toFixed(2) + ' GB';
				}
				if (bytes >= 1048576) {
					return (bytes / 1048576).toFixed(2) + ' MB';
				}
				return (bytes / 1024).toFixed(2) + ' KB';
			},

			formatBitrate: function (bits) {
				if (typeof bits !== 'number') {
					return '';
				}
				if (bits >= 8589934592) {
					return (bits / 8589934592).toFixed(2) + ' GB/s';
				}
				if (bits >= 8388608) {
					return (bits / 8388608).toFixed(2) + ' MB/s';
				}
				if (bits >= 8192) {
					return (bits / 8192).toFixed(2) + ' KB/s';
				}
				return (bits/8).toFixed(2) + ' B/s';
			},

			formatTime: function (seconds) {
				var date = new Date(seconds * 1000),
				days = Math.floor(seconds / 86400);
				days = days ? days + 'd ' : '';
				return days +
				('0' + date.getUTCHours()).slice(-2) + ':' +
				('0' + date.getUTCMinutes()).slice(-2) + ':' +
				('0' + date.getUTCSeconds()).slice(-2);
			},

			formatPercentage: function (floatValue) {
				return (floatValue * 100).toFixed(2) + ' %';
			},

			//格式化进度显示
			cc_renderExtendedProgress: function (data) {
				return this.formatBitrate(data.bitrate) + ' | ' +
				this.formatTime(
						(data.total - data.loaded) * 8 / data.bitrate
				);
			},

			disableFileInputButton: function () {
				$('.fileinput-button input') .prop('disabled', true).parent().addClass('disabled');
			},

			// 开始上传事件处理
			startHandler: function (e) {
				e.preventDefault();
				var button = $(e.currentTarget),
				template = button.closest('.template-upload'),
				data = template.data('data');
				if(data.uploadStatus !==  this.uploadStatusDict.paused && data.uploadStatus !== this.uploadStatusDict.added){
					return;
				}
				button.prop('disabled', true);
				template.find(".start").attr('disabled', true);
				template.find("#pause").attr('disabled', false);
				this.submitUpload(data);
			},
            
			//取消事件处理
			cancelHandler: function (e) {
				e.preventDefault();
				var template = $(e.currentTarget).closest('.template-upload'),
				data = template.data('data') || {};
				$(template).hide();
				if(data.uploadStatus == this.uploadStatusDict.ready){
					this.active -= 1;
					data.uploadStatus =  this.uploadStatusDict.canceled;
				}else{
					data.uploadStatus =  this.uploadStatusDict.canceled;
					data.abort();
				}
				//取消时删除记录
				$(data.context).remove();
			},
			
			//暂停事件处理
			pauseHandler: function (e) {
			    e.preventDefault();
			    var template = $(e.currentTarget).closest('.template-upload'), 
			    data = template.data('data');
			    data.context.find("#pause").attr('style', 'display:none');
			    data.context.find("#resume").attr('style', '').attr('style', 'margin-top:3px;');
			    // 设置暂停
			    if(data.uploadStatus == this.uploadStatusDict.ready){
					this.active -= 1;
					data.uploadStatus =  this.uploadStatusDict.paused;
				}else{
					data.uploadStatus =  this.uploadStatusDict.paused;
					data.abort();
				}
				
			    //暂停回调
			    this.callback('pauseUpload',data);
			},
			
			resumeHandler: function (e) {
				e.preventDefault();
			    var template = $(e.currentTarget).closest('.template-upload'), data = template
			        .data('data');
			    data.context.find("#resume").attr('style', "display:none");
			    data.context.find("#pause").attr('style', '').attr('style',
			        'margin-top:3px;');
			    
				//恢复上传
			    data.submit();
			},
			
			//给每一条记录的操作添加事件
			initRecordEvent:function(node){
				var that = this;
				$(node).find(".start").click(function(e){
					that.startHandler(e);
				});
				$(node).find(".cancel").click(function(e){
					that.cancelHandler(e);
				});
				$(node).find("#pause").click(function(e){
					that.pauseHandler(e);
				});
				$(node).find("#resume").click(function(e){
					that.resumeHandler(e);
				});
			},

			//调用用户配置的回调方法
			callback: function(callbackName){
				var cb = this.options[callbackName]; 
				if($.isFunction(cb)){
					return cb.apply(this.options, Array.prototype.slice.call(arguments,1))
				}
				return true;
			},
	};

	window.CCH5Uploader = function(option) {
		return new CCH5UploaderClass(option);
	};
})(jQuery);
