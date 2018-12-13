package com.dreamwin.h5demo.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.util.HashMap;
import java.util.Map;

import org.apache.commons.lang.StringUtils;
import org.apache.log4j.Logger;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.dreamwin.h5demo.Config;
import com.dreamwin.h5demo.bean.Video;
import com.dreamwin.h5demo.bean.VideoUploadInfo;
import com.dreamwin.h5demo.exception.SparkException;

public class SparkAPI {

    public static Logger logger = Logger.getLogger(SparkAPI.class);

	private static final String CATEGORY_INFO2 = "http://spark.bokecc.com/api/video/category/v2";

	private static final String VIDEO_CREATE_UPLOAD_INFO = "http://spark.bokecc.com/api/video/create/v2";

	/**
	 * 获取分类信息
	 */
	public static JSONObject getCategoryTree() throws SparkException {
		Map<String, String> params = new HashMap<String, String>();
		params.put("userid", Config.USER_ID);
		params.put("format", "json");

		String retrieve = retrieve(CATEGORY_INFO2, params);
		if (StringUtils.isBlank(retrieve)) {
			logger.info(CATEGORY_INFO2 + "?" + QueryStringUtil.createHashedQueryString(params, System.currentTimeMillis(), Config.USER_KEY)
							+ " \t return blank");
			throw new SparkException("retrieve is null");
		}

		JSONObject jsonObject = JSON.parseObject(retrieve);
		String error = jsonObject.getString("error");
		if (StringUtils.isNotBlank(error)) {
			throw new SparkException(error);
		}
		return jsonObject.getJSONObject("video");
	}

    /**
     * 创建视频上传信息
     */
    public static VideoUploadInfo createVideoUploadInfo(Video video) throws SparkException {
        Map<String, String> params = new HashMap<String, String>();
        params.put("userid", Config.USER_ID);
        params.put("title", video.getTitle());
        String tag = video.getTag();
        if (StringUtils.isNotBlank(tag)) {
            params.put("tag", tag);
        }
        String description = video.getDescription();
        if (StringUtils.isNotBlank(description)) {
            params.put("description", description);
        }

        String categoryId = video.getCategoryId();
		if (StringUtils.isNotBlank(categoryId)) {
            params.put("categoryid", categoryId);
        }
        // 可选
        String fileName = video.getFileName();
        if (StringUtils.isNotBlank(fileName)) {
            params.put("filename", fileName);
        }
        params.put("filesize", video.getFileSize() + "");
        params.put("notify_url", video.getNotifyUrl());

        String retrieve = retrieve(VIDEO_CREATE_UPLOAD_INFO, params);
        if (StringUtils.isBlank(retrieve)) {
            logger.info(VIDEO_CREATE_UPLOAD_INFO + "?" + QueryStringUtil.createHashedQueryString(params, System.currentTimeMillis(), Config.USER_KEY) + " \t return blank");
            throw new SparkException("retrieve is null");
        }

        JSONObject jsonObject = JSON.parseObject(retrieve);
        String error = jsonObject.getString("error");
        if (StringUtils.isNotBlank(error)) {
            throw new SparkException(error);
        }

        JSONObject uploadinfoObject = jsonObject.getJSONObject("uploadinfo");
        if (uploadinfoObject == null) {
            throw new SparkException("UNKNOWN ERROR");
        }

        VideoUploadInfo videoUploadInfo = JSON.parseObject(uploadinfoObject.toString(), VideoUploadInfo.class);
        return videoUploadInfo;
    }


    private static String retrieve(String URI, Map<String, String> params) {
        String u = URI + "?" + QueryStringUtil.createHashedQueryString(params, System.currentTimeMillis(), Config.USER_KEY);

        logger.info("retrieve " + u);

        try {
            URL url = new URL(u);
            URLConnection conn = url.openConnection();
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(60000);
            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));

            StringBuffer result = new StringBuffer();
            String line;
            while ((line = reader.readLine()) != null) {
                result.append(line);
            }
            reader.close();
            return result.toString();
        } catch (MalformedURLException e) {
            logger.error("trigger失败：" + u);
        } catch (IOException e) {
            logger.error("trigger失败：" + u);
        }
        return null;
    }

}
