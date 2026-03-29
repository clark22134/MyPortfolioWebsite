package com.clarksprojects.ecommerce.entity;

import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import java.util.Set;

@Entity
@Table(name="product_category")
//@Data -- known bug
@Getter
@Setter
public class ProductCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "category_name")
    private String categoryName;

    // One ProductCategory (category) can have many Products. The cascade = CascadeType.ALL means that any
    // operation (like persist, merge, remove) performed on a ProductCategory will be cascaded to
    // its associated Products. The mappedBy = "category" indicates that the "category" field in
    // the Product entity owns the relationship, meaning that the foreign key is in the "product"
    // table and is managed by the Product entity.
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "category")
    private Set<Product> products;

}
