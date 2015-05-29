/*******************************************************************************
 * eGov suite of products aim to improve the internal efficiency,transparency, 
 *    accountability and the service delivery of the government  organizations.
 * 
 *     Copyright (C) <2015>  eGovernments Foundation
 * 
 *     The updated version of eGov suite of products as by eGovernments Foundation 
 *     is available at http://www.egovernments.org
 * 
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     any later version.
 * 
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 * 
 *     You should have received a copy of the GNU General Public License
 *     along with this program. If not, see http://www.gnu.org/licenses/ or 
 *     http://www.gnu.org/licenses/gpl.html .
 * 
 *     In addition to the terms of the GPL license to be adhered to in using this
 *     program, the following additional terms are to be complied with:
 * 
 * 	1) All versions of this program, verbatim or modified must carry this 
 * 	   Legal Notice.
 * 
 * 	2) Any misrepresentation of the origin of the material is prohibited. It 
 * 	   is required that all modified versions of this material be marked in 
 * 	   reasonable ways as different from the original version.
 * 
 * 	3) This license does not grant any rights to any user of the program 
 * 	   with regards to rights under trademark law for use of the trade names 
 * 	   or trademarks of eGovernments Foundation.
 * 
 *   In case of any queries, you can reach eGovernments Foundation at contact@egovernments.org.
 ******************************************************************************/
package org.egov.infra.persistence.entity;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import javax.persistence.CascadeType;
import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.EntityListeners;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToOne;
import javax.persistence.MappedSuperclass;
import javax.persistence.OneToMany;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;

import org.egov.infra.admin.master.entity.Address;
import org.egov.infra.admin.master.entity.Role;
import org.egov.infra.admin.master.entity.User;
import org.egov.infra.persistence.entity.enums.Gender;
import org.egov.infra.persistence.entity.enums.UserType;
import org.egov.infra.validation.regex.Constants;
import org.egov.search.domain.Searchable;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.search.annotations.DocumentId;
import org.hibernate.validator.constraints.Email;
import org.hibernate.validator.constraints.Length;
import org.hibernate.validator.constraints.SafeHtml;
import org.joda.time.DateTime;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.gson.annotations.Expose;

@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Searchable
public abstract class AbstractUser implements Serializable {
    private static final long serialVersionUID = -2415368058955783970L;

    @Expose
    @Id
    @GenericGenerator(name = "seq_id", strategy = "org.egov.infra.persistence.utils.PrimaryKeyIDGenerator")
    @GeneratedValue(generator = "seq_id")
    @DocumentId
    private Long id;
    
    @NotNull
    @Column(name = "username", unique = true, table = "eg_user")
    @Length(min = 2, max = 64)
    private String username;

    @NotNull
    @Length(min = 8, max = 64)
    @Column(table = "eg_user")
    private String password;

    @Column(table = "eg_user")
    private String salutation;

    @NotNull
    @SafeHtml
    @Length(min = 2, max = 100)
    @Column(table = "eg_user")
    private String name;

    @Enumerated(EnumType.ORDINAL)
    @Column(table = "eg_user")
    private Gender gender;

    @Pattern(regexp = Constants.MOBILE_NUM)
    @SafeHtml
    @Length(max = 15)
    @Column(table = "eg_user")
    private String mobileNumber;

    @Email(regexp = Constants.EMAIL)
    @SafeHtml
    @Length(max = 128)
    @Column(table = "eg_user")
    private String emailId;

    @SafeHtml
    @Column(table = "eg_user")
    private String altContactNumber;

    @SafeHtml
    @Length(max = 10)
    @Column(table = "eg_user")
    private String pan;

    @SafeHtml
    @Length(max = 20)
    @Column(table = "eg_user")
    private String aadhaarNumber;

    @ElementCollection
    @CollectionTable(
          name="eg_address",
          joinColumns=@JoinColumn(name="userid")
    )
    private List<Address> address = new ArrayList<>();

    @Column(table = "eg_user")
    private boolean active;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinTable(name = "eg_userrole", joinColumns = @JoinColumn(name = "userid") , inverseJoinColumns = @JoinColumn(name = "roleid") )
    private Set<Role> roles = new HashSet<>();

    @Temporal(TemporalType.DATE)
    @Column(table = "eg_user")
    private Date dob;

    @NotNull
    @Column(table = "eg_user")
    private Date pwdExpiryDate;

    @NotNull
    @Column(table = "eg_user")
    private String locale;

    @Enumerated(EnumType.ORDINAL)
    @Column(name = "type", table = "eg_user")
    protected UserType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "createdBy",table="eg_user")
    @CreatedBy
    private User createdBy;

    @Temporal(TemporalType.TIMESTAMP)
    @CreatedDate    
    @Searchable(name = "createdDate", group = Searchable.Group.COMMON)
    @Column(table = "eg_user")
    private Date createdDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lastModifiedBy",table="eg_user")
    @LastModifiedBy
    private User lastModifiedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @LastModifiedDate
    @Column(table = "eg_user")
    private Date lastModifiedDate;

    public Long getId() {
        return id;
    }

    protected void setId(final Long id) {
        this.id = id;
    }

    @JsonIgnore
    public String getUsername() {
        return username;
    }

    public void setUsername(final String username) {
        this.username = username;
    }

    @JsonIgnore
    public String getPassword() {
        return password;
    }

    public void setPassword(final String password) {
        this.password = password;
    }

    public String getSalutation() {
        return salutation;
    }

    public void setSalutation(final String salutation) {
        this.salutation = salutation;
    }

    public String getName() {
        return name;
    }

    public void setName(final String name) {
        this.name = name;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(final Gender gender) {
        this.gender = gender;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(final String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public String getEmailId() {
        return emailId;
    }

    public void setEmailId(final String emailId) {
        this.emailId = emailId;
    }

    public String getAltContactNumber() {
        return altContactNumber;
    }

    public void setAltContactNumber(final String altContactNumber) {
        this.altContactNumber = altContactNumber;
    }

    public String getPan() {
        return pan;
    }

    public void setPan(final String pan) {
        this.pan = pan;
    }

    public String getAadhaarNumber() {
        return aadhaarNumber;
    }

    public void setAadhaarNumber(final String aadhaarNumber) {
        this.aadhaarNumber = aadhaarNumber;
    }

    public List<Address> getAddress() {
        return address;
    }

    public void setAddress(final List<Address> address) {
        this.address = address;
    }

    public void addAddress(final Address address) {
        getAddress().add(address);
    }

    public void removeAddress(final Address address) {
        getAddress().remove(address);
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(final boolean active) {
        this.active = active;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void setRoles(final Set<Role> roles) {
        this.roles = roles;
    }

    public void addRole(final Role role) {
        getRoles().add(role);
    }

    public void removeRole(final Role role) {
        getRoles().remove(role);
    }

    public Date getDob() {
        return dob;
    }

    public void setDob(final Date dob) {
        this.dob = dob;
    }

    public DateTime getPwdExpiryDate() {
        return null == pwdExpiryDate ? null : new DateTime(pwdExpiryDate);
    }

    public void setPwdExpiryDate(final Date pwdExpiryDate) {
        this.pwdExpiryDate = pwdExpiryDate;
    }

    public String getLocale() {
        return locale;
    }

    public Locale locale() {
        return new Locale(locale);
    }

    public void setLocale(final String locale) {
        this.locale = locale;
    }

    public UserType getType() {
        return type;
    }

    public void setType(final UserType type) {
        this.type = type;
    }
    
    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(final User createdBy) {
        this.createdBy = createdBy;
    }

    public DateTime getCreatedDate() {
        return null == createdDate ? null : new DateTime(createdDate);
    }

    public void setCreatedDate(final DateTime createdDate) {
        this.createdDate = null == createdDate ? null : createdDate.toDate();
    }

    public User getLastModifiedBy() {
        return lastModifiedBy;
    }

    public void setLastModifiedBy(final User lastModifiedBy) {
        this.lastModifiedBy = lastModifiedBy;
    }

    public DateTime getLastModifiedDate() {
        return null == lastModifiedDate ? null : new DateTime(lastModifiedDate);
    }

    public void setLastModifiedDate(final DateTime lastModifiedDate) {
        this.lastModifiedDate = null == lastModifiedDate ? null : lastModifiedDate.toDate();
    }
    
    public boolean isNew() {
        return null == getId();
    }

    @Override
    public String toString() {
        return String.format("Entity of type %s with id: %s", this.getClass().getName(), getId());
    }

    @Override
    public boolean equals(final Object obj) {
        if (null == obj)
            return false;

        if (this == obj)
            return true;

        if (!getClass().equals(obj.getClass()))
            return false;

        final AbstractUser that = (AbstractUser) obj;

        return null == this.getId() ? false : this.getId().equals(that.getId());
    }

    @Override
    public int hashCode() {
        int hashCode = 17;
        hashCode += null == getId() ? 0 : getId().hashCode() * 31;
        return hashCode;
    }
}
