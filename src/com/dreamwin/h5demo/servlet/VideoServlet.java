package com.dreamwin.h5demo.servlet;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import com.alibaba.fastjson.JSON;
import com.dreamwin.h5demo.bean.Video;
import com.dreamwin.h5demo.bean.VideoUploadInfo;
import com.dreamwin.h5demo.exception.SparkException;
import com.dreamwin.h5demo.util.SparkAPI;
public class VideoServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;

	private static final Logger logger = Logger.getLogger(VideoServlet.class);

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        doGet(req, resp);
    }


	/****
	 * 创建视频信息接口，首先获取请求提交的视频信息参数，然后请求CC视频的spark系统接口，封装spark系统返回结果数据返回给页面
	 */
	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse response) throws ServletException, IOException {
        Map<String, Object> result = new HashMap<String, Object>();
        try {
            Video video = new Video();

            video.setTitle(req.getParameter("title"));
            video.setTag(req.getParameter("tag"));
            video.setFileSize(Long.parseLong(req.getParameter("filesize")));
            video.setNotifyUrl("");
            video.setFileName(req.getParameter("filename"));
            video.setCategoryId(req.getParameter("categoryid"));
            video.setDescription(req.getParameter("description"));

            logger.info("create video " + video);

            VideoUploadInfo videoUploadInfo = SparkAPI.createVideoUploadInfo(video);
            result.put("videoUploadInfo", videoUploadInfo);
        } catch (SparkException e) {
            logger.error("", e);
            result.put("errMsg", e.getMessage());
        } catch (NumberFormatException e) {
            result.put("errMsg", "参数错误");
        }

        response.setContentType("application/json;charset=UTF-8");
        String jsonOutput;
        try {
            jsonOutput = JSON.toJSONString(result);
        } catch (Exception e) {
            jsonOutput = "{err: 'exception'}";
        }
        PrintWriter out = response.getWriter();
        out.write(jsonOutput);
        out.flush();
        out.close();
    }


}
