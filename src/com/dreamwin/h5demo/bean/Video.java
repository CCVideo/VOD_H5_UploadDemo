package com.dreamwin.h5demo.bean;

public class Video {

    private String title;

    private String tag;

    private String description;

    private String categoryId;

    private String fileName;

    private long fileSize;

    private String notifyUrl;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(String categoryId) {
        this.categoryId = categoryId;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getNotifyUrl() {
        return notifyUrl;
    }

    public void setNotifyUrl(String notifyUrl) {
        this.notifyUrl = notifyUrl;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

	@Override
	public String toString() {
		return "Video [title=" + title + ", tag=" + tag + ", description=" + description + ", categoryId=" + categoryId + ", fileName="
						+ fileName + ", fileSize=" + fileSize + ", notifyUrl=" + notifyUrl + "]";
	}

}
