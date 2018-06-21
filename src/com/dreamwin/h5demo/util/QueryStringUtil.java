package com.dreamwin.h5demo.util;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.Map;
import java.util.TreeMap;

public class QueryStringUtil {

    public static String createQueryString(Map<String, String> queryMap) {
        if (queryMap == null) {
            return null;
        }

        if (queryMap.size() == 0) {
            return "";
        }

        try {
            StringBuilder sb = new StringBuilder();
            for (Map.Entry<String, String> entry : queryMap.entrySet()) {
                if (entry.getValue() == null) {
                    continue;
                }
                String key = entry.getKey().trim();
                String value = URLEncoder.encode(entry.getValue().trim(), "utf-8");
                sb.append(String.format("%s=%s&", key, value));
            }
            return sb.substring(0, sb.length() - 1);
        } catch (StringIndexOutOfBoundsException e) {
            return null;
        } catch (UnsupportedEncodingException e) {
            return null;
        }
    }

    public static String createHashedQueryString(Map<String, String> queryMap, long time, String salt) {

        Map<String, String> map = new TreeMap<String, String>(queryMap);
        String qs = QueryStringUtil.createQueryString(map);
        if (qs == null) {
            return null;
        }

        String hash;
        String htqs;
        if (!qs.equals("")) {
            hash = Hashlib.md5(String.format("%s&time=%d&salt=%s", qs, time, salt));
            htqs = String.format("%s&time=%d&hash=%s", qs, time, hash);
        } else {
            hash = Hashlib.md5(String.format("time=%d&salt=%s", time, salt));
            htqs = String.format("time=%d&hash=%s", time, hash);
        }
        return htqs;
    }


}
