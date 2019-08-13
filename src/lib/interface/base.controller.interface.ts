import { Router } from "express";

export default interface BaseControllerInterface {
  setup(router: Router): void;
}