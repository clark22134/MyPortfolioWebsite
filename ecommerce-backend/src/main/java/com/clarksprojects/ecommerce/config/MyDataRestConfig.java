package com.clarksprojects.ecommerce.config;

import com.clarksprojects.ecommerce.entity.Country;
import com.clarksprojects.ecommerce.entity.Product;
import com.clarksprojects.ecommerce.entity.ProductCategory;
import com.clarksprojects.ecommerce.entity.State;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.rest.core.config.RepositoryRestConfiguration;
import org.springframework.data.rest.webmvc.config.RepositoryRestConfigurer;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import jakarta.persistence.EntityManager;
import jakarta.persistence.metamodel.EntityType;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Configuration
public class MyDataRestConfig implements RepositoryRestConfigurer {

    private final EntityManager entityManager;

    MyDataRestConfig(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

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
        Set<EntityType<?>> entities = entityManager.getMetamodel().getEntities();

        List<Class<?>> entityClasses = new ArrayList<>();
        for (EntityType<?> entityType : entities) {
            entityClasses.add(entityType.getJavaType());
        }

        config.exposeIdsFor(entityClasses.toArray(new Class<?>[0]));
    }
}