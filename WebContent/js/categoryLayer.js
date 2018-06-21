function initCategoryTree(cnf){
	if(typeof cnf != 'object'){
		Msg.fail('initCategoryInput 方法的参数必须是对象');
		return;
	}
	var config = {
		containerId:"categoryLayerContainer",
		inputId:null,
		title:'请选择分类' ,
		selectItem:null,
		outerBox:null,
		align:'left',
		defaultVal:null,
		defaultName:'全部分类',
		setDefaultName:null,
		maxHeight:'340px',
		maxWidth:'600px',
		minWidth:'400px',
		hasDefault:false,//选择分类时是否有默认分类项
		needEnsure:true, //是否带有确认
		datas:null, //如果配置了data数据，直接使用数据，否则从接口获取
	};
	//设置用户配置
	for(p in cnf){
		config[p] = cnf[p];
	}
	if(config.defaultVal < 0){
		config.defaultVal = 0;
	}
	//当浮层出现后点击浮层外时让浮层消失
	$("body").click(function(event){
		if(!config.needEnsure){
			hide();
		}else{
			config.categoryLayerContainer.find(".selected:first").removeClass("selected");
			config.categoryLayerContainer.find("#ensureCategory").addClass("disabled");
		}
	});

	//处理输入设置
	dealInput();

	//构造分类框架
	buildContainer();

	//选择是否需要确认
	enableEnsure();

	//构造分类树
	initCategorys(initCategorysCallback);

	//构造完分类树之后的回调处理
	function initCategorysCallback(){
		//初始化分类节点事件 
		initNodeEvents();
	}

	/****
	 * 输入框选择分类时的处理
	 */
	function dealInput(){
		if(!config.inputId){
			return;
		}
		//选择分类的输入框不接受用户输入值
		$("#" + config.inputId).keydown(function(event){
			stopDefault(event);
		});
		//输入框点击时弹出分类或隐藏分类
		$("#" + config.inputId).click(function(event){
			stopEventSpread(event);
		});
		$("#" + config.inputId).mousedown(function(event){
			stopEventSpread(event);
			if(config.categoryLayerContainer.css("display") == 'none'){
				show();
			}else{
				hide();
			}
		});
	}

	/****
	 * 创建分类树框架
	 */
	function buildContainer(){
		//构造分类框架
		var boxHtml = '<div class="category_layer_container" id="' + config.containerId + '"  style="min-width:' + config.minWidth + '">'
		+ ' <div class="sel_category_title">' + config.title + '</div>'
		+ '<div  class="all_category_box" id="category_layer_box" style="max-height:' + config.maxHeight + '"></div>';
		if(config.needEnsure){
			boxHtml = boxHtml + '<div style="height:60px;line-height:60px;text-align:center;"><a class="btn btn-primary disabled" id="ensureCategory">确定</a><a class="btn ml10" id="cancelCategory">取消</a></div>';
		}
		boxHtml = boxHtml + '</div>  ';

		$("#" + config.containerId).remove();
		if(config.needEnsure){
			$("#moveCategoryToContainer").remove();
			$("body").prepend('<div id="moveCategoryToContainer" class="layer_dark" style="display:none; opacity: 0.6;"></div>');
			$("body").append(boxHtml);
		}else{
			$(config.outerBox).append(boxHtml);
		}

		config.categoryLayerContainer = $("#" + config.containerId);
		config.allCateogryBox = config.categoryLayerContainer.find("#category_layer_box");

		if(config.align == 'right'){
			config.categoryLayerContainer.css({"right":"0","left":"auto"});
		}
	}

	/****
	 * 设置默认分类
	 */
	function setDefault(c){
		if(c.id != config.defaultVal){
			return;
		}
		var categoryItem = config.categoryLayerContainer.find("#cat" + config.defaultVal);
		if(categoryItem.length > 0){
			categoryItem.addClass("selected");
			if(typeof config.setDefaultName == 'function'){
				var nameSpan = $(categoryItem).find(".category_name:first");
				var name = nameSpan.attr("title") || $.trim(nameSpan.text());
				var shortName = $.trim(nameSpan.text());
				if(config.inputId != null){
					$("#" + config.inputId).val(name);
					$("#" + config.inputId).attr("title",name);
				}
				config.setDefaultName(name,shortName);
			}

			$(categoryItem).parents(".category_box").each(function(n,ele){
				$(ele).show();
				$(ele).prev(".item").find("i[name='viewSubCategory']").removeClass("icon-plus").addClass("icon-minus");
			});
		}
	}
    
	/****
	 * 添加分类节点
	 */
	function addNode(category){
		var c = category;
		if(c.superId == 0){
			c.deepth = 1;
			var content = buildNodeHtml(c);
			config.allCateogryBox.append(content);
		}else{
			var superNode = config.allCateogryBox.find("#cat" + c.superId);
			if(superNode.length < 1){
				return false;
			}
			c.deepth = parseInt($(superNode).attr("data-deepth")) + 1;
			var content = buildNodeHtml(c);

			var categoryBox = $(superNode).next(".category_box");
			if(categoryBox.length > 0){
				var items = categoryBox.find(".item");
				var hasAdded = false; 
				//找到同一层级中正确的顺序位置插入
				for(var i = 0; i < items.length; i++){
					var item = items[i];
					if(c.id < parseInt($(item).attr("id").substr(3))){
						$(content).insertBefore(item);
						hasAdded = true;
						break;
					}
				}
				if(!hasAdded){
					categoryBox.append(content);
				}
			}else{
				$(superNode).find(".category_name").prepend('<i style="cursor:pointer" name="viewSubCategory" title="展开" class="icon-plus"></i>');
				content = '<div class="category_box">' + content + '</div>';
				$(content).insertAfter(superNode);
			}
		}
		setDefault(c);
		return true;
	}

	/****
	 * 构造分类节点html
	 */
	function buildNodeHtml(category){
		var indent = 20;
		var c =  category;
		var shortName = formatName(c.name);
		var content = '<div class="item" id="cat'+ c.id + '"  data-deepth="' + c.deepth + '"  style="padding-left:' + c.deepth * indent + 'px;">';
		if(shortName.length < c.name.length){
			content = content + '<span class="category_name" data-id="' + c.id + '" title="' + c.name + '">';
		}else{
			content = content + '<span class="category_name" data-id="' + c.id + '">';
		}
		content = content + shortName + '</span></div>' 
		return content;
	}

	/****
	 * 用分类列表数据生成分类树
	 */
	function addCategoryNodes(categorys,superId){
		if(!categorys || categorys.length < 1){
			return;
		}
		for(var i = 0; i < categorys.length; i++){
			var c = categorys[i];
			c.superId = superId;
			addNode(c);
			var subCategorys = c['sub-category'];
		    if(subCategorys != undefined && subCategorys.length > 0){
		    	addCategoryNodes(subCategorys, c.id);
		    }
		}
	}

	/****
	 * 初始化分类树
	 */
	function initCategorys(callback){
		config.allCateogryBox.empty();
		if(!config.needEnsure){
			config.allCateogryBox.css({"border-bottom":"0px"});
		}

		if(config.hasDefault){
			var defaultCategoy = {name:config.defaultName,id:0,superId:0,deepth:0};
			addNode(defaultCategoy);
		}

		var categorys = config.datas;
		if(categorys){
			initCategorysUseData(categorys,callback);
		}
	}

	function initCategorysUseData(categorys,callback){
		if(categorys.length < 1){
			return;
		}
		//用分类列表数据构造分类节点
		addCategoryNodes(categorys, 0);
		//执行回调
		callback();
	}


	function initNodeEvents(){
		// 分类显示/隐藏
		config.allCateogryBox.find("i[name='viewSubCategory']").click(function (e) {
			stopEventSpread(e);
			var $this = $(this);
			// 隐藏
			if ($this.hasClass("icon-minus")) {
				$this.removeClass("icon-minus").addClass("icon-plus");
				$this.parent().parent().next('.category_box').hide();
				$this.prop("title", "展开");
				return;
			}
			$this.removeClass("icon-plus").addClass("icon-minus");
			$this.parent().parent().next('.category_box').show();
			$this.prop("title", "收起");
		});

		//点击时选中
		config.categoryLayerContainer.find(".item").click(function(event){
			var e = event || window.event;
			stopEventSpread(event);
			var target = e.target || e.srcElement;
			if($(target).attr("name") != 'viewSubCategory'){
				config.categoryLayerContainer.find(".selected").removeClass("selected");
				$(this).addClass("selected");
				if(!config.needEnsure){
					var span = $(this).find("span");
					var name = span.attr("title")||$.trim(span.text());
					var shortName = $.trim(span.text());
					if(config.inputId != null){
						$("#"+config.inputId).val(name);
						$("#"+config.inputId).attr("title",name);
					}
					if(typeof config.selectItem == 'function'){
						config.selectItem(span.attr("data-id"),name,shortName);
					}
					hide();
				}else{
					config.categoryLayerContainer.find("#ensureCategory").removeClass("disabled");
				}
			} 
		});
	}

	/***
	 * 选中时是否需要确认
	 */
	function enableEnsure(){
		if(!config.needEnsure){
			return;
		}
		config.categoryLayerContainer.css({"left":"50%","top":"20%","margin-left":"-300px"});

		config.categoryLayerContainer.find("#ensureCategory").click(function(){
			var categoryItem = config.categoryLayerContainer.find(".selected:first");
			if(categoryItem.length > 0){
				var nameSpan = $(categoryItem).find(".category_name:first");
				var name = nameSpan.attr("title")||$.trim(nameSpan.text());
				var shortName = $.trim(nameSpan.text());
				var categoryId = categoryItem.attr("id").substring(3);
				if(config.inputId != null){
					$("#"+config.inputId).val(name);
					$("#"+config.inputId).attr("title", name);
				}
				if(typeof config.selectItem == 'function'){
					config.selectItem(categoryId,name, shortName);
				}
				hide();
			}
		});

		config.categoryLayerContainer.find("#cancelCategory").click(function(){
			hide();
		});
	}

	function show(){
		config.categoryLayerContainer.show();
		if(config.needEnsure){
			$("#moveCategoryToContainer").show();
		} 
	}

	function hide(){
		config.categoryLayerContainer.hide();
		if(config.needEnsure){
			$("#moveCategoryToContainer").hide();
			config.categoryLayerContainer.find(".selected:first").removeClass("selected");
			config.categoryLayerContainer.find("#ensureCategory").addClass("disabled");
		} 
	}

	function formatName(name){
		if(name.length < 28){
			return name;
		}
		name=name.substring(0, 25) + '...';
		return name;
	}

	//返回对象
	return {
		setContainerCss:function(css){
			config.categoryLayerContainer.css(css);
		},
		getDatas :function(){
			return config.datas;
		},
		setTitle:function(tlt){
			config.categoryLayerContainer.find('.sel_category_title').html(tlt);
		},
		showLayer:function(){
			show();
		},
		hideLayer:function(){
			hide();
		},
		setSelectItem:function(callback){
			config.selectItem = callback;
		},
		deleteCategory:function(id){
			var categoryItem = config.categoryLayerContainer.find("#cat" + id);
			var parentBox = $(categoryItem).parent(".category_box");
			categoryItem.next(".category_box").remove();
			categoryItem.remove();
			if(parentBox.length > 0){
				if($(parentBox).find(".item").length < 1){
					$(parentBox).prev(".item").find("i").remove();
					$(parentBox).remove();
				}
			}
		}
	}
}


//阻止事件冒泡
function stopEventSpread(event){
	var e = event || window.event;
	if(e.stopPropagation){
		e.stopPropagation();
	}else{
		e.cancelBubble = true;
	}
}

//阻止事件默认行为
function stopDefault(event)  {
	var e = event||window.event;
	if ( e && e.preventDefault ){ 
		e.preventDefault();
	} else { 
		window.event.returnValue = false;
	} 
}

