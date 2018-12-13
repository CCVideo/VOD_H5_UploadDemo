package com.dreamwin.h5demo.bean;

import com.alibaba.fastjson.annotation.JSONField;

public class VideoUploadInfo {

    @JSONField(name = "videoid")
    private String videoId;

    @JSONField(name = "userid")
    private String userId;

    @JSONField(name = "servicetype")
    private String serviceType;

    @JSONField(name = "metaurl")
    private String metaUrl;

    @JSONField(name = "chunkurl")
    private String chunkUrl;

    public String getVideoId() {
        return videoId;
    }

    public void setVideoId(String videoId) {
        this.videoId = videoId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getServiceType() {
        return serviceType;
    }

    public void setServiceType(String serviceType) {
        this.serviceType = serviceType;
    }

    public String getMetaUrl() {
        return metaUrl;
    }

    public void setMetaUrl(String metaUrl) {
        this.metaUrl = metaUrl;
    }

    public String getChunkUrl() {
        return chunkUrl;
    }

    public void setChunkUrl(String chunkUrl) {
        this.chunkUrl = chunkUrl;
    }

	@Override
	public String toString() {
		return "VideoUploadInfo [videoId=" + videoId + ", userId=" + userId + ", serviceType=" + serviceType + ", metaUrl=" + metaUrl
						+ ", chunkUrl=" + chunkUrl + "]";
	}

}
