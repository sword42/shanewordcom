+++
date = "2016-06-02T15:06:19-07:00"
draft = false
title = "JWT on Spring Boot example"
author = "Shane"
description = "JWT on Spring Boot example"
headerimage = "/img/photo-1463412855783-af97e375664b-lg.jpg"
headertitle = "JWT on Spring Boot example"
darkenheader = true
+++

With all the recent moves to decentralized stateless services, its a good idea to look at a token implementation for your API calls. I started with a custom internal token for the API authentication, post login on [https://www.servabusi.com](https://www.servabusi.com), but looked to move to JWT as a more standardized implementation once it became clear that JWT provided an easy way to have an auth token that's simple, yet could be intercompatibile with other auth systems. This is an example implementation showing how you can use JWT for managing your auth needs, without having to build a complex auth infrastructure.

All code for this example is available on github.com at [https://github.com/sword42/spring-boot-jwt-example](https://github.com/sword42/spring-boot-jwt-example).

If you want to skip the whats and the whys, you can go directly to the [how](#howtodothisinspringboot)

## What is an auth token infrastructure?

You'll probably need to secure your API services, to make sure only valid requests (and requestors) are calling them, and so you can identify the requestor for authorization purposes. HTTP supports a few different forms of authorization by default, and you can add your own custom ones as well. For the purpose of this post, we'll be concerned with Basic Auth and Token(Bearer) Auth. Basic Auth is usually used to pass Username and Password in the request for authorization. If you don't want the password (which is supposed to be kept secret) to be passed in every request, then you'll need to give the client something else they can pass with future requests to authenticate.  Something like a Token or a Key.

HTTP has a header field called Authorization, which can be used to pass Authorization info from the client to the server. Alternately, you can use a custom header field (which some folks do to avoid confusion). For Basic Auth, the Username and Password are appended to each other, Base64 encoded, and that encoded value is added to "Basic " and the result is put into the Authorization header, so that the result looks like:

```java
Authorization: Basic dm9yZGVsOnZvcmRlbA==
```

If you're going to use the Authorization field for Token Authentication, you can do something similar (once you have a token). This example uses the Auth Type of "Bearer", so that the server recognizes that the value means something different from a request with Basic, which is passing the username and password. You can append the Token to "Bearer " and put the result into the Authorization header, so that the result looks like:

```java
Authorization: Bearer npaouvajsdfj8u8as08vs9v8asuvaIUHDFIUHGasfapisuvhasjvnasdjasfuasdfjasfjasfa9s7hfsah
```

Then, the server can retrieve that from the HTTP header on the request, check to make sure its valid, and let the request through. The validity check depends on your infrastructure. You could have a shared session among your servers that keeps track of valid tokens. You could have a shared secret that's used to generate the tokens, and which can be used to check the token cryptographically. There are many ways to validate the token, depending on your infrastructure and needs, but by using a token, you likely reduce your server load (because a user/password check doesn't have to happen each time), and you open the doors to some interesting API server options (like truly stateless servers).

To get a Token, you either have to have been given one already (like an API Key), or a previous request (like the Basic Auth Request) would need to return a Token in a custom field in the HTTP response, so that the client can use that token in future requests.

## What is JWT?

JWTs or [JSON Web Tokens](https://en.wikipedia.org/wiki/JSON_Web_Token) are a RFC standard for creating a token with a known structure. The JWT structure has 3 parts: a header, a payload, and a signature. The Header declares the JWT type, along with the Hashing algorithm used. The Signature is a value that can be used to verify that nothing has changed since the server generated it, since the server will have either used a hashing algorithm with a secret, or a RSA public/private key. The Payload is used to communicate the "Claims" this JWT is asserting are true, such as who the token represents or other details you want either the client or server applications to have access to.

Some folks put lots of details into the Payload. For example, they might have all their User Info included so they can process requests from the User without needing to lookup details in a persistent store. This carries a few downsides. The Token info is visible to anyone who gets access to the token, so you might leak user info. It also means that if the user info changes, you need to issue a new token and make sure all clients are updated. Since managing these things can get risky, its a better idea to try an minimize the information in the Payload to only what's required, even if that means the server or client might need to lookup information more often. At a minimum, if the JWT is for a user, you're going to want some User Identifier so you can find the user that this request is for. In our example, we'll use username.

## Why JWT?

Since most API layers are likely going to have a Token infrastructure anyways, using JWT provides a standard way to do it. It also provides feature like expiration and security for the tokens. Also, depending on your Token Validation scheme, you can easily avoid Shared Sessions, to allow your API servers to be truly stateless, with less load, less risk, and more scalability.

## <a name="howtodothisinspringboot">How to do this in Spring Boot?</a>

Enough with the Overview, lets look into how to make this work with a Spring Boot App. Our App is going to use the Spring Security framework as well, since it makes it easy to add the Authentication into a Spring environment.

We'll make this example very simple by having a few compromises. We'll only have a single root destination "/" which will return a JSON object with {"home":"home"}. That root destination will require authentication. We'll have an in-memory User Store with a single User "user" with password "user". Since this is an API server, we won't have a login page when the user gets a 401 response, instead we'll leave it to the client to handle passing the http basic credentials in the request. For example, Chrome will prompt the user to enter in their credentials, and will auto encode them in the follow-up request.

We'll also only be using a Shared Secret on the server to sign the tokens. A Shared Secret will work for a small number of servers, but for anything more than that, a RSA public/private key pair should be used to sign.

With these compromises in place, we'll be left with a few components to make this work:

* [SampleControllerApplication](https://github.com/sword42/spring-boot-jwt-example/blob/master/src/main/java/com/shaneword/springbootjwtexample/SampleControllerApplication.java): a starting application, with a main method, the HomeController, and the ApplicationSecurity definition, which wires everything together
* [JWTAuthenticationProvider](https://github.com/sword42/spring-boot-jwt-example/blob/master/src/main/java/com/shaneword/springbootjwtexample/JWTAuthenticationProvider.java): a Spring Security component which validates the JWT Authentication. We'll also use it to generate a JWT token
* [JWTAuthentication](https://github.com/sword42/spring-boot-jwt-example/blob/master/src/main/java/com/shaneword/springbootjwtexample/JWTAuthentication.java): which holds the information about an Authentication, both before validation, and after
* [SpringSecurityJWTAuthenticationFilter](https://github.com/sword42/spring-boot-jwt-example/blob/master/src/main/java/com/shaneword/springbootjwtexample/SpringSecurityJWTAuthenticationFilter.java): which makes sure a Bearer Auth HTTP request passes in the JWTAuthentication for Auth
* [SpringSecurityAddJWTTokenFilter](https://github.com/sword42/spring-boot-jwt-example/blob/master/src/main/java/com/shaneword/springbootjwtexample/SpringSecurityAddJWTTokenFilter.java): which adds the custom field on to the HTTP Response Header to pass the token back to the client


## SampleControllerApplication

The application starting point has a main method so that it can be run directly

```java

    public static void main(String[] args) throws Exception {
        SpringApplication.run(SampleControllerApplication.class, args);
    }

```

it also has some basic Spring annotations to let us use Annotation based configuration:

```java

@ComponentScan
@EnableAutoConfiguration
public class SampleControllerApplication {
	...
}

```

from there, we need a Spring Configuration, which we've attached to the ApplicationSecurity object.  We've also defined the Shared Secret as an external config parameter (passed in as an Env Variable JWT_SECRET if available, and a default "defaultSecret" if its not):
```java

    @Configuration
    @Order(SecurityProperties.ACCESS_OVERRIDE_ORDER)
    protected static class ApplicationSecurity extends WebSecurityConfigurerAdapter {
        @Value("${JWT_SECRET:defaultSecret}")
        protected String secret;

		  ...
		}

```

The ApplicationSecurity object sets up the HTTP environment through one configure method, by setting all requests to require authentication, enabling httpBasic setup, and attaching our Custom Filters, with the JWT Auth one coming before the HTTP Basic Filter, and the filter to add the JWT token to the response coming after the HTTP Basic Filter. That way, if a request is authenticated without a Token, we'll still provide one in the response:

```java

        @Override
        protected void configure(HttpSecurity http) throws Exception {
            http
                .authorizeRequests()
                .anyRequest().authenticated().and()
                .httpBasic().and()
                .csrf().disable();
            http.addFilterBefore(new SpringSecurityJWTAuthenticationFilter(super.authenticationManagerBean()),
                    BasicAuthenticationFilter.class);
            http.addFilterAfter(new SpringSecurityAddJWTTokenFilter(jwtAuthenticationProvider()),
                    BasicAuthenticationFilter.class);
        }

```

The other ApplicationSecurity methods configure the Authentication environment, in our case, setting up a JWTAuthenticationProvider, and defining the in Memory Authentication store with the single user:

```java

        @Override
        public void configure(AuthenticationManagerBuilder auth) throws Exception {
            auth.authenticationProvider(jwtAuthenticationProvider())
                    .inMemoryAuthentication().withUser("user").password("user").roles("USER");
        }

        @Bean
        public JWTAuthenticationProvider jwtAuthenticationProvider() {
            return new JWTAuthenticationProvider(secret);
        }

```



## JWTAuthenticationProvider

To avoid doing all the JWT setup and calculations by hand, we'll be using Stormpath's [JJWT libary](https://github.com/jwtk/jjwt) to perform the JWT work. JJWT lets you use a builder pattern for setting up and validating the JWT, and encapsulates most of the JWT functions.

We'll construct the JWTAuthenticationProvider with the Shared Secret, so it can be used to validate and create JWT tokens. We'll define a default token duration and expiration buffer, along with an Issuer Id:

```java

public class JWTAuthenticationProvider implements AuthenticationProvider {

    public static final long TOKEN_DURATION_SECONDS = 60 * 60 * 24 * 7; // 1 week
    public static final long TOKEN_CREATION_BUFFER_SECONDS = 60 * 5; // 5 min
    public static final String ISSUER_ID = "FooBar";

    protected String secret;

    public JWTAuthenticationProvider(String tSecret) {
        secret = tSecret;
    }
...
}

```

The AuthenticationProvider interface requires us to support an authenticate method, to verify an authentication request, and return the valid Authentication, or throw an exception if its no valid. The supports method allows us to only receive JWTAuthentication requests.

Once we have one of these requests, we'll need to use the Jwts class to parse the token, verifying our ISSUER_ID and Signing Key. Even if the token passes those checks though, we'll still need to check to make sure the current date/time is valid for the token.

If the token passes all those checks, we'll update the Authentication with the Token's claims and set it as Authenticated.

```java

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        JWTAuthentication jwtAuth = (JWTAuthentication)authentication;
        Jws<Claims> jws;
        try {
            jws = Jwts.parser()
                    .requireIssuer(ISSUER_ID)
                    .setSigningKey(secret)
                    .parseClaimsJws(jwtAuth.getToken());
        } catch (ExpiredJwtException | UnsupportedJwtException | MalformedJwtException | SignatureException |
                IllegalArgumentException ex) {
            throw new BadCredentialsException("The token is not valid");
        }
        Date checkDate = Date.from(Instant.now());
        Date expirDate = jws.getBody().getExpiration();
        if (null == expirDate || checkDate.after(expirDate) ) {
            throw new BadCredentialsException("The token is expired");
        }
        Date notBeforeDate = jws.getBody().getNotBefore();
        if (null == notBeforeDate || checkDate.before(notBeforeDate) ) {
            throw new BadCredentialsException("The token not before date is invalid");
        }
        jwtAuth.setTokenClaims(jws.getBody());
        jwtAuth.setAuthenticated(true);
        return jwtAuth;
    }

```

we'll need to also implement the AuthenticationProvider interface's support method to make sure we only get JWTAuthentications

```java

    @Override
    public boolean supports(Class<?> authentication) {
        return JWTAuthentication.class.isAssignableFrom(authentication);
    }

```

we'll also use the JWTAuthenticationProvider to host our method to create a JWT given a set of Claims (in our case, just the username). Since the JWTAuthenticationProvider already has access to the JJWT library, and the configuration info, it keeps everything fairly encapsulated.

```java

    public String createJWTToken(String username) {
         return Jwts.builder()
                 .setSubject(username)
                 .setIssuer(ISSUER_ID)
                 .setIssuedAt(Date.from(Instant.now()))
                 .setExpiration(Date.from(Instant.now().plusSeconds(TOKEN_DURATION_SECONDS)))
                 .setNotBefore(Date.from(Instant.now().minusSeconds(TOKEN_CREATION_BUFFER_SECONDS)))
                 .signWith(SignatureAlgorithm.HS512, secret)
                 .compact();
    }

```

## JWTAuthentication

We'll also need our Authentication object to plug into the Spring Security infrastructure. This object will hold both the token itself, along with the payload information, in case someone needs it. Most of the class is just getters/setters, so I won't post the whole thing, since you can read it at [JWTAuthentication](https://github.com/sword42/spring-boot-jwt-example/blob/master/src/main/java/com/shaneword/springbootjwtexample/JWTAuthentication.java). The setting of Token Claims is a little interesting though, because it provides an opportunity to take a claim from the token (in this case "roles"), and map them into the Spring Security Authority framework, to directly use the Spring Security Role Based Authorization:

```java

public class JWTAuthentication implements Authentication {
	...

	    public void setTokenClaims(Claims tTokenClaims) {
	        this.tokenClaims = tTokenClaims;
	        Collection roles = tokenClaims.get(ROLES_CLAIM_NAME, Collection.class);
	        if (null != roles) {
	            ArrayList<GrantedAuthority> authsList = new ArrayList<>(roles.size());
	            for (Object role : roles) {
	                authsList.add(new SimpleGrantedAuthority(role.toString()));
	            }
	            authorities = Collections.unmodifiableList(authsList);
	        } else {
	            authorities = Collections.emptyList();
	        }
	    }
}

```

## SpringSecurityJWTAuthenticationFilter

This filter checks a http request to see if it includes a JWT Authorization. If it does, then it tries to verify it with the AuthenticationManager. If it verifies, then it sets the SecurityContext's Authentication to the verified JWTAuthentication and sets a return header to re-pass the token back to the user again. Regardless of if it verifies the token or not, it'll pass the HTTP Request down the Filter Chain to continue processing it. Also, if this were a production implementation, you'd probably want any exceptions in authenticating tokens to be passed to your logging framework instead of System out'ing.

```java

public class SpringSecurityJWTAuthenticationFilter extends GenericFilterBean {

    protected AuthenticationManager authenticationManager;

    public SpringSecurityJWTAuthenticationFilter(AuthenticationManager  tAuthenticationManager) {
        authenticationManager = tAuthenticationManager;
    }
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest)request;
        HttpServletResponse httpResponse = (HttpServletResponse)response;
        String authHeader = httpRequest.getHeader("Authorization");
        String[] authInfo = null;
        if (null != authHeader) {
            authInfo = authHeader.split(" ");
        }
        if (null != authInfo && authInfo.length == 2 && authInfo[0].toUpperCase().startsWith("BEARER")) {
            // retrieve authentication details from request
            JWTAuthentication token = new JWTAuthentication(authInfo[1]);
            // Make sure we're authenticated
            try {
                Authentication auth = authenticationManager.authenticate(token);
                SecurityContextHolder.getContext().setAuthentication(auth);
                httpResponse.setHeader("X-AuthToken", authInfo[1]);
            } catch (Exception ex) {
                System.out.println("Exception: "+ex.getMessage());
                SecurityContextHolder.getContext().setAuthentication(null);
            }
            chain.doFilter(request, response);
            SecurityContextHolder.getContext().setAuthentication(null);
        } else {
            chain.doFilter(request, response);
        }
    }
}

```

## SpringSecurityAddJWTTokenFilter

Finally, the SpringSecurityAddJWTTokenFilter makes sure to add a token on the HTTP Response if it was an authenticated request, and the Principal was a User. Since we only have an implementation to generate JWTs from a username right now, we're limited to User Principal JWTs, but there's no reason why an implementation couldn't be setup to return back tokens for other types of principals.

```java

public class SpringSecurityAddJWTTokenFilter extends GenericFilterBean {
    protected JWTAuthenticationProvider jwtAuthenticationProvider;

    public SpringSecurityAddJWTTokenFilter(JWTAuthenticationProvider tJWTAuthenticationProvider) {
        jwtAuthenticationProvider = tJWTAuthenticationProvider;
    }

    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest)request;
        HttpServletResponse httpResponse = (HttpServletResponse)response;
        Authentication createdAuth = SecurityContextHolder.getContext().getAuthentication();
        if (null != createdAuth && createdAuth.isAuthenticated()) {
            if (createdAuth.getPrincipal() instanceof User) {
                User theUser = (User)createdAuth.getPrincipal();
                if (null != theUser.getUsername()) {
                    String jwtToken = jwtAuthenticationProvider.createJWTToken(theUser.getUsername());
                    httpResponse.setHeader("X-AuthToken", jwtToken);
                }
            }
        }
        chain.doFilter(request, response);
    }
}

```

## Verifying it

If you compile the project and run the Application, it'll start up a server on localhost (at port 8080 unless you change it). If you point a browser at http://localhost:8080 you can see the 401 response and challenge, depending on the browser. Looking at the network response in the developer tools would let you see the token in the HTTP response headers, but you can't easily pass the token auth header to test it.

You can use curl to validate though:

```bash
curl http://localhost:8080/
```
will return a 401 response.

If you pass the basic Authorization info, then it should return a response:

```bash
curl --user user:user http://localhost:8080/
```

That doesn't show us the token though, so we can tell curl to just show response headers to see the token:

```bash
curl --user user:user -I http://localhost:8080/
```

Which should show the X-AuthToken header in the response. You can then copy that and paste it into another request to use the token for auth and see a successful response:

```bash
curl -H "Authorization: Bearer <Insert Token Here>" http://localhost:8080/
```

And you should be able to see a valid response returned.

## In Conclusion

Using JWTs doesn't take much work.  Most of these classes could be extracted out to a generic set of classes (perhaps as a future endeavor). With a token based auth infrastructure like this you can simply and easily secure your APIs in a scalable fashion.
