package com.clarksprojects.ecommerce.config;

import com.clarksprojects.ecommerce.entity.Country;
import com.clarksprojects.ecommerce.entity.Product;
import com.clarksprojects.ecommerce.entity.ProductCategory;
import com.clarksprojects.ecommerce.entity.State;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.rest.core.config.RepositoryRestConfiguration;
import org.springframework.data.rest.webmvc.config.RepositoryRestConfigurer;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import jakarta.persistence.EntityManager;
import jakarta.persistence.metamodel.EntityType;

@Configuration
@RequiredArgsConstructor
public class MyDataRestConfig implements RepositoryRestConfigurer {

    private final EntityManager entityManager;

    @Override
    public void configureRepositoryRestConfiguration(RepositoryRestConfiguration config, CorsRegistry cors) {
        HttpMethod[] unsupportedActions = {HttpMethod.PUT, HttpMethod.POST, HttpMethod.DELETE, HttpMethod.PATCH};

        disableHttpMethods(config, Product.class, unsupportedActions);
        disableHttpMethods(config, ProductCategory.class, unsupportedActions);
        disableHttpMethods(config, Country.class, unsupportedActions);
        disableHttpMethods(config, State.class, unsupportedActions);

        exposeIds(config);
    }

    private void disableHttpMethods(RepositoryRestConfiguration config, Class<?> domainType, HttpMethod[] methods) {
        config.getExposureConfiguration()
                .forDomainType(domainType)
                .withItemExposure((metadata, httpMethods) -> httpMethods.disable(methods))
                .withCollectionExposure((metadata, httpMethods) -> httpMethods.disable(methods));
    }

    private void exposeIds(RepositoryRestConfiguration config) {
        Class<?>[] entityClasses = entityManager.getMetamodel().getEntities().stream()
                .map(EntityType::getJavaType)
                .toArray(Class<?>[]::new);
        config.exposeIdsFor(entityClasses);
    }
}