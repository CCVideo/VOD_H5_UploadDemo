//加载分类
loadCategory();

var uploader = new CCH5Uploader(
		{
			timeout : 180000, // 设置超时处理时间 超时时间3分钟 超时会重试
			maxChunkSize : 1024 * 1024, // 1M 最大不超过4M
			limitConcurrentUploads : 3, //并发上传文件数
			maxRetries : 10, // 文件上传失败重试次数,默认10次
			retryTimeout : 500, //重试延迟时间（毫秒）
			autoUpload : true, //是否添加文件后自动上传
			fileInput : $("#fileupload").find("input[type='file']"), //文件输入组件，必需要有的配置,可以是多个
			filesContainer : $('.files'), //上传文件记录显示的容器
			
			// 重写获取分类名的方法,没有分类时不需要配置或者返回null
			getCategoryName : function() {
				var hasCategory = $("#uploadCategory").length > 0;
				if (!hasCategory) {
					return null;
				}
				return $("#selectCategoryInput").attr("title");
			},
			//重写获取分类id的方法,没有分类时不需要配置或者返回null
			getCategoryId : function() {
				var hasCategory = $("#uploadCategory").length > 0;
				if (!hasCategory) {
					return null;
				}
				return $("#uploadCategory").val();
			},
			//上传失败重试指定次数后依然失败后的回调
			uploadFail : function(recordNode, fileName, failMsg) {
				errorMsgHandler(getShortStr(fileName, 10) + "文件上传失败,原因：" + failMsg);
				if (recordNode.find('.rate').length > 0) {
					if(recordNode.find("#pause").css("display") != "none"){
						recordNode.find("#pause").click();
					}
					// 有暂停操作的示例
					recordNode.find('.rate').html('<div class="tc" style="margin-top:6px;color:red;">上传失败</div>');
				} else {
					// 无暂停操作的示例
					recordNode.find('.start').parent().append('<span style="color:red;">上传失败</span>');
				}
			},
			
			//上传成功回调,可不做任何处理
			uploadSuccess : function(recordNode, fileName, ccvid) {
				console.log(fileName + '上传成功');
				console.log("对应的视频id为：" + ccvid);
				console.log(recordNode);
			},
			
			// 生成视频信息
			createuploadinfo: function(fileName, fileSize, categoryId){
				var video = {};
				var encodeFileName = encodeURIComponent(fileName);
				var d = {
					"title" : encodeFileName,
					"filename" : encodeFileName,
					"filesize" : fileSize
				};
				
				//默认分类时不传分类id参数
				if (!!categoryId && categoryId != 0) {
					d.categoryid = categoryId;
				}
				
				$.ajax({
					url : "/video/createuploadinfo",
					async : false, //必须以同步的方式执行，否则后续操作拿不到接口返回的数据
					type : "post",
					data : d,
					cache : false,
					dataType : "json",
					contentType : "application/x-www-form-urlencoded; charset=UTF-8",
					error : function() {
						video = {
							"errMsg" : "获取视频文件vid出错",
							"errorType" : "network"
						};
					},
					success : function(data) {
						if(data.errMsg){
							video.errMsg = data.errMsg;
							return;
						}
						video.success = true;
						video.uid = data.videoUploadInfo.userid;
						video.ccvid = data.videoUploadInfo.videoid;
						video.servicetype = data.videoUploadInfo.servicetype;
						video.name = fileName;
						video.uri = data.videoUploadInfo.chunkurl;
						video.metauri = data.videoUploadInfo.metaurl;
						video.size = fileSize;
					}
				});
		        return video;
		    }
		});


/*******************************************************************************
 * 加载分类
 */
function loadCategory() {
	$.getJSON('/category/info?t=' + Math.random(), function(data) {
		if (data.error) {
			errorMsgHandler('加载分类失败');
			return;
		}
		var categoryDatas = data.category;
		// 构造分类树
		var categoryTree = initCategoryTree({
			datas : categoryDatas,
			inputId : 'selectCategoryInput',
			outerBox : $("#selectCategoryInput").parent(),
			needEnsure : false,
			hasDefault : true,
			defaultName : '默认分类',
			defaultVal : $("#uploadCategory").val(),
			selectItem : function(categoryId, name, shortName) {
				$("#uploadCategory").val(categoryId);
			},
			setDeaultName : function(name, shortName) {
				$("#selectCategoryInput").val(shortName);
			}
		});
	});
}

window.onbeforeunload = function(e) {
	if ($('.progress.progress-striped.active.mb0.tc_rel').length) {
		return '视频上传中，离开页面将无法继续上传？';
	} else {
		if (!window.event) {
			return null;
		}
	}
};

function getShortStr(str,maxLen){
	if(typeof str != 'string' || str.length <= maxLen){
		return str;
	}
	return str.substr(0,maxLen) + '...';
}

function errorMsgHandler(msg) {
	alert(msg);
}