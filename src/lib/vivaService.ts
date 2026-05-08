// lib/vivaService.ts

export type Viva = {
  id: string
  module: string
  duration: string
}

// Fake DB (temporary)
let vivas: Viva[] = []

export const vivaService = {

  async getVivas(): Promise<Viva[]> {
    return vivas
  },

  async createViva(data: Omit<Viva, "id">): Promise<Viva> {

    const newViva: Viva = {
      id: Date.now().toString(),
      ...data
    }

    vivas.push(newViva)

    return newViva
  }
}