import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FichaTemporadaComponent } from './ficha-temporada';

describe('FichaTemporadaComponent', () => {
  let component: FichaTemporadaComponent;
  let fixture: ComponentFixture<FichaTemporadaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichaTemporadaComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FichaTemporadaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});