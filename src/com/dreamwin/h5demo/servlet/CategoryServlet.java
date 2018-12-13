package com.dreamwin.h5demo.servlet;

import java.io.IOException;
import java.io.PrintWriter;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import com.alibaba.fastjson.JSONObject;
import com.dreamwin.h5demo.exception.SparkException;
import com.dreamwin.h5demo.util.SparkAPI;

public class CategoryServlet extends HttpServlet {
	private static final long serialVersionUID = 1L;

	private static final Logger logger = Logger.getLogger(CategoryServlet.class);

	/****
	 * 获取分类接口
	 */
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse response) throws ServletException, IOException {
		response.setContentType("application/json;charset=UTF-8");
		PrintWriter out = response.getWriter();
		try {
			JSONObject categorys = SparkAPI.getCategoryTree();
			out.write(categorys.toJSONString());
		} catch (SparkException e) {
			logger.error("", e);
			out.write("{\"error\":\"获取分类数据失败\"}");
		}
		out.flush();
		out.close();
	}


}
