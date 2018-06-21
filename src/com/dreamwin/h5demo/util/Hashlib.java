package com.dreamwin.h5demo.util;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class Hashlib {

    public static String md5(String src) {
        return Hashlib.digest(src, "MD5");
    }

    private static String digest(String src, String name) {
        try {
            MessageDigest alg = MessageDigest.getInstance(name);
            byte[] result = alg.digest(src.getBytes());
            return byte2hex(result);
        } catch (NoSuchAlgorithmException ex) {
            return null;
        }
    }

    public static String byte2hex(byte[] b) {
        if (b == null) {
            return null;
        }

        StringBuilder hs = new StringBuilder();
        String stmp = "";
        for (byte element : b) {
            stmp = (Integer.toHexString(element & 0XFF));
            if (stmp.length() == 1) {
                hs.append("0" + stmp);
            } else {
                hs.append(stmp);
            }
        }
        return hs.toString().toUpperCase();
    }

	public static void main(String[] args) {
		String str = md5("dsfsdfsdfsdfsdfsdf");
		System.out.println(str);
	}
}
