-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
USE `mydb` ;

-- -----------------------------------------------------
-- Table `mydb`.`ROLES`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`ROLES` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NULL,
  `descripcion` VARCHAR(255) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`USUARIOS`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`USUARIOS` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `activo` TINYINT NOT NULL,
  `fecha_creacion` DATETIME NULL,
  `ROLES_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_USUARIOS_ROLES_idx` (`ROLES_id` ASC) VISIBLE,
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE,
  CONSTRAINT `fk_USUARIOS_ROLES`
    FOREIGN KEY (`ROLES_id`)
    REFERENCES `mydb`.`ROLES` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`TIPOS_VEHICULO`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`TIPOS_VEHICULO` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NULL,
  `descripcion` VARCHAR(255) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`ESPACIOS`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`ESPACIOS` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(30) NULL,
  `disponible` TINYINT NULL,
  `TIPOS_VEHICULO_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_ESPACIOS_TIPOS_VEHICULO1_idx` (`TIPOS_VEHICULO_id` ASC) VISIBLE,
  CONSTRAINT `fk_ESPACIOS_TIPOS_VEHICULO1`
    FOREIGN KEY (`TIPOS_VEHICULO_id`)
    REFERENCES `mydb`.`TIPOS_VEHICULO` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`TARIFAS`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`TARIFAS` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NULL,
  `tipo_cobro` ENUM('POR_MINUTO', 'POR_HORA', 'POR_DIA', 'FRACCION') NULL,
  `valor` DECIMAL(10,2) NULL,
  `activo` TINYINT NULL,
  `fecha_inicio` DATE NULL,
  `fecha_fin` DATE NULL,
  `TIPOS_VEHICULO_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_TARIFAS_TIPOS_VEHICULO1_idx` (`TIPOS_VEHICULO_id` ASC) VISIBLE,
  CONSTRAINT `fk_TARIFAS_TIPOS_VEHICULO1`
    FOREIGN KEY (`TIPOS_VEHICULO_id`)
    REFERENCES `mydb`.`TIPOS_VEHICULO` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`REGISTROS`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`REGISTROS` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `placa` VARCHAR(6) NOT NULL,
  `fecha_hora_entrada` DATETIME NULL,
  `fecha_hora_salida` DATETIME NULL,
  `minutos_totales` INT NULL,
  `valor_calculado` DECIMAL(10,2) NULL,
  `estado` ENUM('EN_CURSO', 'FINALIZADO') NULL,
  `TIPOS_VEHICULO_id` INT NOT NULL,
  `ESPACIOS_id` INT NOT NULL,
  `TARIFAS_id` INT NOT NULL,
  `usuario_entrada_id` INT NOT NULL,
  `usuario_salida_id` INT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_REGISTROS_TIPOS_VEHICULO1_idx` (`TIPOS_VEHICULO_id` ASC) VISIBLE,
  INDEX `fk_REGISTROS_ESPACIOS1_idx` (`ESPACIOS_id` ASC) VISIBLE,
  INDEX `fk_REGISTROS_TARIFAS1_idx` (`TARIFAS_id` ASC) VISIBLE,
  INDEX `fk_REGISTROS_USUARIOS1_idx` (`usuario_entrada_id` ASC) VISIBLE,
  INDEX `fk_REGISTROS_USUARIOS2_idx` (`usuario_salida_id` ASC) VISIBLE,
  CONSTRAINT `fk_REGISTROS_TIPOS_VEHICULO1`
    FOREIGN KEY (`TIPOS_VEHICULO_id`)
    REFERENCES `mydb`.`TIPOS_VEHICULO` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_REGISTROS_ESPACIOS1`
    FOREIGN KEY (`ESPACIOS_id`)
    REFERENCES `mydb`.`ESPACIOS` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_REGISTROS_TARIFAS1`
    FOREIGN KEY (`TARIFAS_id`)
    REFERENCES `mydb`.`TARIFAS` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_REGISTROS_USUARIOS1`
    FOREIGN KEY (`usuario_entrada_id`)
    REFERENCES `mydb`.`USUARIOS` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_REGISTROS_USUARIOS2`
    FOREIGN KEY (`usuario_salida_id`)
    REFERENCES `mydb`.`USUARIOS` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`TICKETS`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`TICKETS` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `codigo_ticket` VARCHAR(80) NOT NULL,
  `email_cliente` VARCHAR(150) NOT NULL,
  `enviado_email` TINYINT NULL,
  `fecha_emision` DATETIME NULL,
  `REGISTROS_id` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `codigo_ticket_UNIQUE` (`codigo_ticket` ASC) VISIBLE,
  INDEX `fk_TICKETS_REGISTROS1_idx` (`REGISTROS_id` ASC) VISIBLE,
  CONSTRAINT `fk_TICKETS_REGISTROS1`
    FOREIGN KEY (`REGISTROS_id`)
    REFERENCES `mydb`.`REGISTROS` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
